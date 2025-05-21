import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { executeQuery, executeQuerySingle } from '@/utils/sql';

export interface UserSession {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  permissions: string[];
  roles: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: UserSession;
  token?: string;
  error?: string;
}

class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  // Hashear password
  async hashPassword(password: string): Promise<string> {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    return bcrypt.hash(password, rounds);
  }

  // Verificar password
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Generar JWT token
  generateToken(user: UserSession): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn } as jwt.SignOptions
    );
  }

  // Verificar JWT token
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Obtener permisos de usuario (directos + por roles)
  async getUserPermissions(userId: number): Promise<string[]> {
    try {
      const permissions = await executeQuery<{ permission_key: string }>(
        `SELECT DISTINCT p.permission_key
         FROM permissions p
         WHERE p.active = 1 
         AND p.id IN (
           -- Permisos directos
           SELECT up.permission_id 
           FROM user_permissions up 
           WHERE up.user_id = @userId
           
           UNION
           
           -- Permisos por roles
           SELECT rp.permission_id 
           FROM role_permissions rp
           INNER JOIN user_roles ur ON rp.role_id = ur.role_id
           WHERE ur.user_id = @userId
         )
         ORDER BY p.permission_key`,
        { userId }
      );

      return permissions.map(p => p.permission_key);
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  // Obtener roles de usuario
  async getUserRoles(userId: number): Promise<string[]> {
    try {
      const roles = await executeQuery<{ name: string }>(
        `SELECT r.name
         FROM roles r
         INNER JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = @userId AND r.active = 1
         ORDER BY r.name`,
        { userId }
      );

      return roles.map(r => r.name);
    } catch (error) {
      console.error('Error getting user roles:', error);
      return [];
    }
  }

  // Login de usuario
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { email, password } = credentials;

      // Buscar usuario por email
      const user = await executeQuerySingle<{
        id: number;
        email: string;
        password: string;
        name: string;
        avatar?: string;
        active: boolean;
      }>(
        'SELECT id, email, password, name, avatar, active FROM users WHERE email = @email',
        { email }
      );

      if (!user || !user.active) {
        return { success: false, error: 'Usuario no encontrado o inactivo' };
      }

      // Verificar password (manejar caso especial del admin)
      let passwordValid = false;
      if (user.email === 'admin@admin.cl' && user.password === '123') {
        passwordValid = password === '123';
      } else {
        passwordValid = await this.verifyPassword(password, user.password);
      }

      if (!passwordValid) {
        return { success: false, error: 'Credenciales inválidas' };
      }

      // Obtener permisos y roles
      const [permissions, roles] = await Promise.all([
        this.getUserPermissions(user.id),
        this.getUserRoles(user.id)
      ]);

      const userSession: UserSession = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        permissions,
        roles
      };

      // Generar token
      const token = this.generateToken(userSession);

      // Actualizar último login
      await executeQuery(
        'UPDATE users SET last_login = GETDATE() WHERE id = @id',
        { id: user.id }
      );

      // Opcional: Guardar sesión en BD
      await this.saveSession(user.id, token);

      return {
        success: true,
        user: userSession,
        token
      };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }

  // Verificar si usuario tiene un permiso específico
  async hasPermission(userId: number, permission: string): Promise<boolean> {
    try {
      const result = await executeQuerySingle<{ has_permission: number }>(
        'EXEC sp_check_user_permission @user_id, @permission_key',
        { user_id: userId, permission_key: permission }
      );

      return (result?.has_permission ?? 0) > 0;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  // Verificar autenticación desde request
  async verifyAuthFromRequest(request: NextRequest): Promise<UserSession | null> {
    try {
      const token = this.extractTokenFromRequest(request);
      if (!token) return null;

      // Verificar si el token existe en la base de datos y no ha expirado
      const sessionData = await executeQuerySingle<{
        user_id: number;
        expires_at: Date;
      }>(
        'SELECT user_id, expires_at FROM user_sessions WHERE session_token = @token AND expires_at > GETDATE()',
        { token }
      );

      if (!sessionData) {
        // Token no existe o ha expirado
        return null;
      }

      // Verificar que el token JWT también sea válido
      const decoded = this.verifyToken(token);
      if (decoded.id !== sessionData.user_id) {
        // Token no coincide con el usuario
        return null;
      }
      
      // Revalidar usuario y obtener permisos actualizados
      const user = await executeQuerySingle<{
        id: number;
        email: string;
        name: string;
        avatar?: string;
        active: boolean;
      }>(
        'SELECT id, email, name, avatar, active FROM users WHERE id = @id',
        { id: sessionData.user_id }
      );

      if (!user || !user.active) {
        // Usuario no existe o está inactivo, limpiar sesión
        await this.cleanupSession(token);
        return null;
      }

      // Actualizar último acceso de la sesión
      await executeQuery(
        'UPDATE user_sessions SET expires_at = DATEADD(hour, 24, GETDATE()) WHERE session_token = @token',
        { token }
      );

      const [permissions, roles] = await Promise.all([
        this.getUserPermissions(user.id),
        this.getUserRoles(user.id)
      ]);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        permissions,
        roles
      };

    } catch (error) {
      console.error('Auth verification error:', error);
      return null;
    }
  }

  // Extraer token del request
  private extractTokenFromRequest(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // También buscar en cookies
    const tokenCookie = request.cookies.get('auth-token');
    return tokenCookie?.value || null;
  }

  // Guardar sesión en BD (opcional)
  private async saveSession(userId: number, token: string): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas

      await executeQuery(
        `INSERT INTO user_sessions (user_id, session_token, expires_at)
         VALUES (@userId, @token, @expiresAt)`,
        { userId, token, expiresAt }
      );
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  // Cerrar sesión
  async logout(token: string): Promise<boolean> {
    try {
      await executeQuery(
        'DELETE FROM user_sessions WHERE session_token = @token',
        { token }
      );
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  // Limpiar sesiones expiradas
  async cleanExpiredSessions(): Promise<void> {
    try {
      await executeQuery(
        'DELETE FROM user_sessions WHERE expires_at < GETDATE()'
      );
    } catch (error) {
      console.error('Error cleaning expired sessions:', error);
    }
  }

  // Limpiar una sesión específica
  private async cleanupSession(token: string): Promise<void> {
    try {
      await executeQuery(
        'DELETE FROM user_sessions WHERE session_token = @token',
        { token }
      );
    } catch (error) {
      console.error('Error cleaning up session:', error);
    }
  }

  // Invalidar todas las sesiones de un usuario
  async invalidateUserSessions(userId: number): Promise<void> {
    try {
      await executeQuery(
        'DELETE FROM user_sessions WHERE user_id = @userId',
        { userId }
      );
    } catch (error) {
      console.error('Error invalidating user sessions:', error);
    }
  }
}

// Instancia singleton
const authService = new AuthService();

// Exportar funciones de conveniencia
export const hashPassword = (password: string) => authService.hashPassword(password);
export const verifyPassword = (password: string, hash: string) => authService.verifyPassword(password, hash);
export const generateToken = (user: UserSession) => authService.generateToken(user);
export const verifyToken = (token: string) => authService.verifyToken(token);
export const login = (credentials: LoginCredentials) => authService.login(credentials);
export const hasPermission = (userId: number, permission: string) => authService.hasPermission(userId, permission);
export const verifyAuthFromRequest = (request: NextRequest) => authService.verifyAuthFromRequest(request);
export const logout = (token: string) => authService.logout(token);
export const cleanExpiredSessions = () => authService.cleanExpiredSessions();
export const invalidateUserSessions = (userId: number) => authService.invalidateUserSessions(userId);

export default authService;