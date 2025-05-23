import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { executeQuery, executeQuerySingle } from '@/utils/sql';

export interface Organization {
  id: string;
  name: string;
  logo?: string;
  rut?: string;
}

export interface UserSession {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  permissions: string[];
  roles: string[];
  organizations?: Organization[];
  currentOrganization?: Organization;
}

export interface LoginCredentials {
  email: string;
  password: string;
  organizationId?: string; // Para cuando ya se ha seleccionado la organización
}

export interface AuthResult {
  success: boolean;
  user?: UserSession;
  token?: string;
  error?: string;
  organizations?: Organization[]; // Para cuando el usuario tiene múltiples organizaciones
  requiresOrganizationSelection?: boolean; // Indica si necesita seleccionar organización
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

  // Obtener permisos de usuario para una organización específica (directos + por roles)
  async getUserPermissions(userId: number, organizationId?: string): Promise<string[]> {
    try {
      // Si no se especifica organización, obtener permisos de la primera organización del usuario
      if (!organizationId) {
        const firstOrg = await executeQuerySingle<{ organization_id: string }>(
          'SELECT TOP 1 organization_id FROM user_organizations WHERE user_id = @userId',
          { userId }
        );
        if (!firstOrg) return [];
        organizationId = firstOrg.organization_id;
      }

      // Verificar si el usuario es Super Admin
      const roles = await this.getUserRoles(userId, organizationId);
      const isSuperAdmin = roles.includes('Super Admin');

      // Debug temporal
      console.log('🔍 getUserPermissions Debug:', {
        userId,
        organizationId,
        roles,
        isSuperAdmin
      });

      let permissions: { name: string }[] = [];

      if (isSuperAdmin) {
        // Para Super Admin: obtener TODOS los permisos existentes en el sistema
        permissions = await executeQuery<{ name: string }>(
          `SELECT DISTINCT name
           FROM permissions
           WHERE active = 1
           ORDER BY name`
        );
      } else {
        // Para usuarios normales: solo permisos de la organización actual
        permissions = await executeQuery<{ name: string }>(
          `SELECT DISTINCT p.name
           FROM permissions p
           WHERE p.organization_id = @organizationId
           AND p.active = 1
           AND p.id IN (
             -- Permisos directos
             SELECT up.permission_id 
             FROM user_permission_assignments up 
             WHERE up.user_id = @userId 
             AND up.organization_id = @organizationId
             AND up.active = 1
             
             UNION
             
             -- Permisos por roles
             SELECT rp.permission_id 
             FROM role_permission_assignments rp
             INNER JOIN user_role_assignments ur ON rp.role_id = ur.role_id
             WHERE ur.user_id = @userId 
             AND ur.organization_id = @organizationId
             AND ur.active = 1
             AND rp.active = 1
           )
           ORDER BY p.name`,
          { userId, organizationId }
        );
      }

      const permissionNames = permissions.map(p => p.name);
      
      // Debug temporal
      console.log('🔍 Permissions Result:', {
        userId,
        organizationId,
        isSuperAdmin,
        permissionCount: permissionNames.length,
        permissions: permissionNames,
        hasOrganizationsViewAll: permissionNames.includes('organizations:view_all')
      });

      return permissionNames;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  // Obtener organizaciones de un usuario
  async getUserOrganizations(userId: number): Promise<Organization[]> {
    try {
      // Verificar si es Super Admin
      const isSuperAdmin = await executeQuerySingle<{ role_count: number }>(
        `SELECT COUNT(*) as role_count
         FROM user_role_assignments ur
         INNER JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = @userId 
         AND ur.active = 1
         AND r.name = 'Super Admin'
         AND r.active = 1`,
        { userId }
      );

      console.log('🔍 getUserOrganizations - Super Admin check:', {
        userId,
        isSuperAdmin: (isSuperAdmin?.role_count || 0) > 0,
        roleCount: isSuperAdmin?.role_count || 0
      });

      let organizations;
      
      if ((isSuperAdmin?.role_count || 0) > 0) {
        // Para Super Admin: obtener TODAS las organizaciones activas
        organizations = await executeQuery<{
          id: string;
          name: string;
          logo?: string;
          rut?: string;
        }>(
          `SELECT id, name, logo, rut
           FROM organizations
           WHERE active = 1
           ORDER BY name`,
          {}
        );
      } else {
        // Para usuarios normales: solo organizaciones asignadas
        organizations = await executeQuery<{
          id: string;
          name: string;
          logo?: string;
          rut?: string;
        }>(
          `SELECT o.id, o.name, o.logo, o.rut
           FROM organizations o
           INNER JOIN user_organizations uo ON o.id = uo.organization_id
           WHERE uo.user_id = @userId AND uo.active = 1 AND o.active = 1
           ORDER BY o.name`,
          { userId }
        );
      }

      console.log('🔍 getUserOrganizations - Organizations found:', {
        userId,
        count: organizations.length,
        organizations: organizations.slice(0, 3) // Solo mostrar las primeras 3 para debug
      });

      return organizations.map(org => ({
        id: org.id,
        name: org.name,
        logo: org.logo,
        rut: org.rut
      }));
    } catch (error) {
      console.error('Error getting user organizations:', error);
      return [];
    }
  }

  // Obtener roles de usuario para una organización específica
  async getUserRoles(userId: number, organizationId?: string): Promise<string[]> {
    try {
      // Primero verificar si el usuario tiene el rol Super Admin (que es global)
      const superAdminRole = await executeQuerySingle<{ name: string }>(
        `SELECT r.name
         FROM roles r
         INNER JOIN user_role_assignments ur ON r.id = ur.role_id
         WHERE ur.user_id = @userId 
         AND ur.active = 1
         AND r.name = 'Super Admin'
         AND r.active = 1`,
        { userId }
      );

      const roleNames: string[] = [];
      
      // Si es Super Admin, agregarlo a la lista
      if (superAdminRole) {
        roleNames.push(superAdminRole.name);
      }

      // Si se especifica una organización, obtener roles específicos de esa organización
      if (organizationId) {
        const orgRoles = await executeQuery<{ name: string }>(
          `SELECT r.name
           FROM roles r
           INNER JOIN user_role_assignments ur ON r.id = ur.role_id
           WHERE ur.user_id = @userId 
           AND ur.organization_id = @organizationId
           AND ur.active = 1
           AND r.active = 1
           ORDER BY r.name`,
          { userId, organizationId }
        );

        // Agregar roles de la organización (evitando duplicados)
        orgRoles.forEach(role => {
          if (!roleNames.includes(role.name)) {
            roleNames.push(role.name);
          }
        });
      }

      return roleNames;
    } catch (error) {
      console.error('Error getting user roles:', error);
      return [];
    }
  }

// Login de usuario - VERSION DIAGNOSTICO
async login(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    const { email, password, organizationId } = credentials;

    console.log('🔍 === INICIO LOGIN DEBUG ===');
    console.log('🔍 Email:', email);
    console.log('🔍 Password recibido:', password);
    console.log('🔍 Password length:', password?.length);
    console.log('🔍 Password type:', typeof password);

    // Buscar usuario por email
    const user = await executeQuerySingle<{
      id: number;
      email: string;
      password_hash: string;
      name: string;
      avatar?: string;
      active: boolean;
    }>(
      'SELECT id, email, password_hash, name, avatar, active FROM users WHERE email = @email',
      { email }
    );

    console.log('🔍 Usuario encontrado:', user ? 'SÍ' : 'NO');
    if (user) {
      console.log('🔍 User ID:', user.id);
      console.log('🔍 User Email:', user.email);
      console.log('🔍 User Active:', user.active);
      console.log('🔍 Password Hash en BD:', user.password_hash);
      console.log('🔍 Hash length:', user.password_hash?.length);
      console.log('🔍 Hash type:', typeof user.password_hash);
      
      // Verificar formato del hash
      const hashPattern = /^\$2[aby]\$\d{1,2}\$.{53}$/;
      const isValidHashFormat = hashPattern.test(user.password_hash);
      console.log('🔍 Formato hash válido:', isValidHashFormat);
      
      // Mostrar partes del hash
      if (user.password_hash) {
        const hashParts = user.password_hash.split('$');
        console.log('🔍 Hash parts:', {
          algorithm: hashParts[1], // debería ser 2a, 2b, o 2y
          rounds: hashParts[2],    // debería ser 10 normalmente
          saltAndHash: hashParts[3]?.length // debería ser 53 caracteres
        });
      }
    }

    if (!user || !user.active) {
      console.log('🔍 === FIN LOGIN DEBUG (Usuario no encontrado/inactivo) ===');
      return { success: false, error: 'Usuario no encontrado o inactivo' };
    }

    // TESTS ADICIONALES DE VERIFICACION
    console.log('🔍 === INICIANDO VERIFICACION PASSWORD ===');
    
    // Test 1: Verificación normal
    console.log('🔍 Test 1: Verificación normal');
    try {
      const passwordValid1 = await this.verifyPassword(password, user.password_hash);
      console.log('🔍 Test 1 resultado:', passwordValid1);
    } catch (error) {
      console.log('🔍 Test 1 ERROR:', error);
    }

    // Test 2: Verificación directa con bcrypt
    console.log('🔍 Test 2: Verificación directa bcrypt');
    try {
      const bcrypt = require('bcryptjs');
      const passwordValid2 = await bcrypt.compare(password, user.password_hash);
      console.log('🔍 Test 2 resultado:', passwordValid2);
    } catch (error) {
      console.log('🔍 Test 2 ERROR:', error);
    }

    // Test 3: Verificar que podemos hashear la password
    console.log('🔍 Test 3: Generando nuevo hash para comparar');
    try {
      const newHash = await this.hashPassword(password);
      console.log('🔍 Test 3 nuevo hash:', newHash);
      const testCompare = await this.verifyPassword(password, newHash);
      console.log('🔍 Test 3 verificación nuevo hash:', testCompare);
    } catch (error) {
      console.log('🔍 Test 3 ERROR:', error);
    }

    // Test 4: Verificar caracteres especiales
    console.log('🔍 Test 4: Análisis de caracteres');
    console.log('🔍 Password chars:', Array.from(password).map(c => c.charCodeAt(0)));
    console.log('🔍 Password escaped:', JSON.stringify(password));

    // Verificación final
    const passwordValid = await this.verifyPassword(password, user.password_hash);
    console.log('🔍 === RESULTADO FINAL VERIFICACION ===');
    console.log('🔍 Password válido:', passwordValid);
    console.log('🔍 === FIN LOGIN DEBUG ===');

    if (!passwordValid) {
      return { success: false, error: 'Credenciales inválidas' };
    }

    // Resto del código igual...
    const organizations = await this.getUserOrganizations(user.id);

    if (organizations.length === 0) {
      return { success: false, error: 'Usuario sin organizaciones asignadas' };
    }

    if (organizations.length > 1 && !organizationId) {
      return {
        success: true,
        requiresOrganizationSelection: true,
        organizations,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          permissions: [],
          roles: [],
          organizations
        }
      };
    }

    const selectedOrgId = organizationId || organizations[0].id;
    const selectedOrg = organizations.find(org => org.id === selectedOrgId);

    if (!selectedOrg) {
      return { success: false, error: 'Organización no válida' };
    }

    const isSuperAdmin = await this.checkIfSuperAdmin(user.id);
    if (!isSuperAdmin) {
      const isExpired = await this.checkOrganizationExpired(selectedOrgId);
      if (isExpired) {
        return { success: false, error: 'La organización ha expirado. Contacte al administrador.' };
      }
    }

    const [permissions, roles] = await Promise.all([
      this.getUserPermissions(user.id, selectedOrgId),
      this.getUserRoles(user.id, selectedOrgId)
    ]);

    const userSession: UserSession = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      permissions,
      roles,
      organizations,
      currentOrganization: selectedOrg
    };

    const token = this.generateToken(userSession);

    await executeQuery(
      'UPDATE users SET updated_at = GETDATE() WHERE id = @id',
      { id: user.id }
    );

    await this.saveSession(user.id, token, selectedOrgId);

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

  // Verificar si usuario tiene un permiso específico en una organización
  async hasPermission(userId: number, permission: string, organizationId?: string): Promise<boolean> {
    try {
      // Si no se especifica organización, usar la primera organización del usuario
      if (!organizationId) {
        const firstOrg = await executeQuerySingle<{ organization_id: string }>(
          'SELECT TOP 1 organization_id FROM user_organizations WHERE user_id = @userId',
          { userId }
        );
        if (!firstOrg) return false;
        organizationId = firstOrg.organization_id;
      }

      const result = await executeQuerySingle<{ has_permission: number }>(
        'EXEC sp_get_user_permissions @user_id, @organization_id',
        { user_id: userId, organization_id: organizationId }
      );

      // Buscar el permiso específico en los resultados
      const permissions = await this.getUserPermissions(userId, organizationId);
      return permissions.includes(permission);
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
        organization_id: string;
        expires_at: Date;
      }>(
        'SELECT user_id, organization_id, expires_at FROM user_sessions WHERE session_token = @token AND expires_at > GETDATE()',
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
        'UPDATE user_sessions SET expires_at = DATEADD(hour, 24, GETDATE()), last_activity = GETDATE(), updated_at = GETDATE(), updated_by_id = @userId WHERE session_token = @token',
        { token, userId: sessionData.user_id }
      );

      // Verificar si la organización ha expirado (solo para usuarios no Super Admin)
      const isSuperAdmin = await this.checkIfSuperAdmin(user.id);
      if (!isSuperAdmin && sessionData.organization_id) {
        const isExpired = await this.checkOrganizationExpired(sessionData.organization_id);
        if (isExpired) {
          // Limpiar sesión si la organización ha expirado
          await this.cleanupSession(token);
          return null;
        }
      }

      const [permissions, roles] = await Promise.all([
        this.getUserPermissions(user.id, sessionData.organization_id),
        this.getUserRoles(user.id, sessionData.organization_id)
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
  private async saveSession(userId: number, token: string, organizationId: string): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas

      await executeQuery(
        `INSERT INTO user_sessions (session_token, user_id, organization_id, expires_at, created_at, updated_at, created_by_id, updated_by_id, last_activity)
         VALUES (@token, @userId, @organizationId, @expiresAt, GETDATE(), GETDATE(), @userId, @userId, GETDATE())`,
        { userId, organizationId, token, expiresAt }
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

  // Verificar si una organización ha expirado
  async checkOrganizationExpired(organizationId: string): Promise<boolean> {
    try {
      const org = await executeQuerySingle<{ expires_at: Date | null }>(
        'SELECT expires_at FROM organizations WHERE id = @organizationId AND active = 1',
        { organizationId }
      );
      
      if (!org || !org.expires_at) {
        return false; // NULL = nunca expira
      }
      
      const now = new Date();
      const expiresAt = new Date(org.expires_at);
      
      return now > expiresAt;
    } catch (error) {
      console.error('Error checking organization expiration:', error);
      return false; // En caso de error, permitir acceso
    }
  }

  // Verificar si un usuario es Super Admin
  async checkIfSuperAdmin(userId: number): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId);
      return roles.includes('Super Admin');
    } catch (error) {
      console.error('Error checking super admin status:', error);
      return false;
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
export const getUserOrganizations = (userId: number) => authService.getUserOrganizations(userId);
export const getUserPermissions = (userId: number, organizationId?: string) => authService.getUserPermissions(userId, organizationId);
export const getUserRoles = (userId: number, organizationId?: string) => authService.getUserRoles(userId, organizationId);

export default authService;