import { executeQuery, executeQuerySingle } from '@/utils/sql';
import { emailService } from '@/email/services/email.service';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface PasswordResetToken {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
  used_at?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface PasswordResetRequest {
  email: string;
  ip_address?: string;
  user_agent?: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  ip_address?: string;
  user_agent?: string;
}

export interface PasswordResetResult {
  success: boolean;
  message?: string;
  error?: string;
  token?: string;
  expiresAt?: Date;
}

export class PasswordResetService {
  /**
   * Genera un token seguro para reset de contraseña
   */
  private static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calcula la fecha de expiración del token (24 horas por defecto)
   */
  private static getExpirationDate(hoursFromNow: number = 24): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + hoursFromNow);
    return expiration;
  }

  /**
   * Solicita un reset de contraseña para un email
   */
  static async requestPasswordReset(request: PasswordResetRequest): Promise<PasswordResetResult> {
    try {
      // Verificar que el servicio de email esté configurado
      if (!emailService.isConfigured()) {
        return {
          success: false,
          error: 'El servicio de email no está configurado. Contacta al administrador del sistema.'
        };
      }

      // Buscar usuario por email
      const user = await executeQuerySingle<{
        id: number;
        email: string;
        name: string;
        active: boolean;
      }>(
        'SELECT id, email, name, active FROM users WHERE email = @email',
        { email: request.email.toLowerCase().trim() }
      );

      // Por seguridad, siempre devolvemos el mismo mensaje
      // independientemente de si el usuario existe o no
      const standardMessage = 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación en unos minutos.';

      if (!user) {
        return {
          success: true,
          message: standardMessage
        };
      }

      if (!user.active) {
        return {
          success: true,
          message: standardMessage
        };
      }

      // Verificar si ya existe un token válido reciente (últimos 5 minutos)
      const recentToken = await executeQuerySingle<{ id: number; created_at: string }>(
        `SELECT id, created_at FROM password_reset_tokens 
         WHERE user_id = @userId AND used = 0 AND expires_at > GETDATE()
         AND created_at > DATEADD(minute, -5, GETDATE())`,
        { userId: user.id }
      );

      if (recentToken) {
        return {
          success: true,
          message: 'Ya se envió un enlace de recuperación recientemente. Revisa tu email o espera unos minutos antes de solicitar otro.'
        };
      }

      // Invalidar tokens anteriores del usuario
      await executeQuery(
        'UPDATE password_reset_tokens SET used = 1, used_at = GETDATE() WHERE user_id = @userId AND used = 0',
        { userId: user.id }
      );

      // Generar nuevo token
      const token = this.generateSecureToken();
      const expiresAt = this.getExpirationDate();

      // Guardar token en la base de datos
      await executeQuery(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address, user_agent, created_at)
         VALUES (@userId, @token, @expiresAt, @ipAddress, @userAgent, GETDATE())`,
        {
          userId: user.id,
          token,
          expiresAt,
          ipAddress: request.ip_address,
          userAgent: request.user_agent
        }
      );

      // Enviar email de recuperación
      const emailResult = await emailService.sendPasswordRecovery(
        user.email,
        token,
        user.name
      );

      if (!emailResult.success) {
        console.error('Error enviando email de recuperación:', emailResult.error);
        return {
          success: false,
          error: 'Error enviando el email de recuperación. Inténtalo de nuevo más tarde.'
        };
      }

      return {
        success: true,
        message: standardMessage,
        token, // Solo para debugging en desarrollo
        expiresAt
      };

    } catch (error) {
      console.error('Error en requestPasswordReset:', error);
      return {
        success: false,
        error: 'Error interno del servidor. Inténtalo de nuevo más tarde.'
      };
    }
  }

  /**
   * Valida un token de reset de contraseña
   */
  static async validateResetToken(token: string): Promise<PasswordResetResult> {
    try {
      if (!token || token.length !== 64) {
        return {
          success: false,
          error: 'Token inválido'
        };
      }

      const tokenData = await executeQuerySingle<{
        id: number;
        user_id: number;
        expires_at: string;
        used: boolean;
        user_email: string;
        user_name: string;
        user_active: boolean;
      }>(
        `SELECT 
           prt.id, prt.user_id, prt.expires_at, prt.used,
           u.email as user_email, u.name as user_name, u.active as user_active
         FROM password_reset_tokens prt
         INNER JOIN users u ON prt.user_id = u.id
         WHERE prt.token = @token`,
        { token }
      );

      if (!tokenData) {
        return {
          success: false,
          error: 'Token inválido o expirado'
        };
      }

      if (tokenData.used) {
        return {
          success: false,
          error: 'Este token ya fue utilizado'
        };
      }

      if (!tokenData.user_active) {
        return {
          success: false,
          error: 'La cuenta de usuario está desactivada'
        };
      }

      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        return {
          success: false,
          error: 'Token expirado'
        };
      }

      return {
        success: true,
        message: 'Token válido'
      };

    } catch (error) {
      console.error('Error en validateResetToken:', error);
      return {
        success: false,
        error: 'Error validando el token'
      };
    }
  }

  /**
   * Confirma el reset de contraseña con un token válido
   */
  static async confirmPasswordReset(request: PasswordResetConfirm): Promise<PasswordResetResult> {
    try {
      // Validar entrada
      if (!request.token || request.token.length !== 64) {
        return {
          success: false,
          error: 'Token inválido'
        };
      }

      if (!request.newPassword || request.newPassword.length < 6) {
        return {
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres'
        };
      }

      // Buscar y validar token
      const tokenData = await executeQuerySingle<{
        id: number;
        user_id: number;
        expires_at: string;
        used: boolean;
        user_email: string;
        user_name: string;
        user_active: boolean;
      }>(
        `SELECT 
           prt.id, prt.user_id, prt.expires_at, prt.used,
           u.email as user_email, u.name as user_name, u.active as user_active
         FROM password_reset_tokens prt
         INNER JOIN users u ON prt.user_id = u.id
         WHERE prt.token = @token`,
        { token: request.token }
      );

      if (!tokenData) {
        return {
          success: false,
          error: 'Token inválido o expirado'
        };
      }

      if (tokenData.used) {
        return {
          success: false,
          error: 'Este token ya fue utilizado'
        };
      }

      if (!tokenData.user_active) {
        return {
          success: false,
          error: 'La cuenta de usuario está desactivada'
        };
      }

      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        return {
          success: false,
          error: 'Token expirado'
        };
      }

      // Hash de la nueva contraseña
      const hashedPassword = await bcrypt.hash(request.newPassword, 12);

      // Actualizar contraseña del usuario
      await executeQuery(
        'UPDATE users SET password_hash = @passwordHash, updated_at = GETDATE() WHERE id = @userId',
        {
          passwordHash: hashedPassword,
          userId: tokenData.user_id
        }
      );

      // Marcar token como usado
      await executeQuery(
        'UPDATE password_reset_tokens SET used = 1, used_at = GETDATE() WHERE id = @tokenId',
        { tokenId: tokenData.id }
      );

      // Invalidar todos los otros tokens del usuario
      await executeQuery(
        'UPDATE password_reset_tokens SET used = 1, used_at = GETDATE() WHERE user_id = @userId AND used = 0',
        { userId: tokenData.user_id }
      );

      // Enviar email de confirmación
      try {
        await emailService.sendPasswordChangedNotification(
          tokenData.user_email,
          tokenData.user_name
        );
      } catch (emailError) {
        console.warn('Error enviando email de confirmación:', emailError);
        // No fallar el reset por error de email
      }

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente'
      };

    } catch (error) {
      console.error('Error en confirmPasswordReset:', error);
      return {
        success: false,
        error: 'Error actualizando la contraseña. Inténtalo de nuevo.'
      };
    }
  }

  /**
   * Limpia tokens expirados (para tareas de mantenimiento)
   */
  static async cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
    try {
      const result = await executeQuerySingle<{ deleted_tokens: number }>(
        'EXEC sp_cleanup_expired_reset_tokens'
      );

      return {
        deletedCount: result?.deleted_tokens || 0
      };
    } catch (error) {
      console.error('Error en cleanupExpiredTokens:', error);
      return { deletedCount: 0 };
    }
  }

  /**
   * Invalida todos los tokens de un usuario (para logout completo)
   */
  static async invalidateUserTokens(userId: number): Promise<{ invalidatedCount: number }> {
    try {
      const result = await executeQuerySingle<{ invalidated_tokens: number }>(
        'EXEC sp_invalidate_user_reset_tokens @user_id',
        { user_id: userId }
      );

      return {
        invalidatedCount: result?.invalidated_tokens || 0
      };
    } catch (error) {
      console.error('Error en invalidateUserTokens:', error);
      return { invalidatedCount: 0 };
    }
  }

  /**
   * Obtiene estadísticas de tokens de reset
   */
  static async getResetTokenStats(): Promise<{
    totalActive: number;
    totalExpired: number;
    totalUsed: number;
    recentRequests: number;
  }> {
    try {
      const stats = await executeQuerySingle<{
        total_active: number;
        total_expired: number;
        total_used: number;
        recent_requests: number;
      }>(
        `SELECT 
           COUNT(CASE WHEN used = 0 AND expires_at > GETDATE() THEN 1 END) as total_active,
           COUNT(CASE WHEN expires_at <= GETDATE() THEN 1 END) as total_expired,
           COUNT(CASE WHEN used = 1 THEN 1 END) as total_used,
           COUNT(CASE WHEN created_at > DATEADD(hour, -24, GETDATE()) THEN 1 END) as recent_requests
         FROM password_reset_tokens`
      );

      return {
        totalActive: stats?.total_active || 0,
        totalExpired: stats?.total_expired || 0,
        totalUsed: stats?.total_used || 0,
        recentRequests: stats?.recent_requests || 0
      };
    } catch (error) {
      console.error('Error en getResetTokenStats:', error);
      return {
        totalActive: 0,
        totalExpired: 0,
        totalUsed: 0,
        recentRequests: 0
      };
    }
  }
}