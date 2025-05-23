import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { executeQuery, executeQuerySingle, executeTransaction } from '@/utils/sql';
import bcrypt from 'bcryptjs';

interface ChangePasswordRequest {
  newPassword: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    if (!(await hasPermission(user.id, 'users:edit'))) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'ID de usuario inválido' }, { status: 400 });
    }

    const body: ChangePasswordRequest = await request.json();
    
    if (!body.newPassword || body.newPassword.length < 6) {
      return NextResponse.json({ 
        success: false, 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      }, { status: 400 });
    }

    // 1. Verificar si el usuario existe y está activo
    const targetUser = await executeQuerySingle<{ id: number; active: boolean; email: string }>(
      'SELECT id, active, email FROM users WHERE id = @userId',
      { userId }
    );

    if (!targetUser || !targetUser.active) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // 2. Verificar si el usuario está en múltiples organizaciones
    const orgCount = await executeQuerySingle<{ count: number }>(
      `SELECT COUNT(DISTINCT organization_id) as count 
       FROM user_organizations 
       WHERE user_id = @userId AND active = 1`,
      { userId }
    );

    const isMultiOrg = (orgCount?.count || 0) > 1;

    // 3. Verificar si el usuario pertenece a la organización del admin actual
    const isSuperAdmin = user.roles?.includes('Super Admin') || false;
    let userInCurrentOrg = false;

    if (!isSuperAdmin) {
      const userOrgCheck = await executeQuerySingle<{ exists: number }>(
        `SELECT COUNT(*) as exists 
         FROM user_organizations 
         WHERE user_id = @userId 
         AND organization_id = @currentOrgId 
         AND active = 1`,
        { 
          userId, 
          currentOrgId: user.currentOrganization?.id 
        }
      );
      
      userInCurrentOrg = (userOrgCheck?.exists || 0) > 0;
    } else {
      userInCurrentOrg = true; // Super Admin can manage any user
    }

    // 4. Validar que puede cambiar la contraseña
    // Super Admin puede cambiar cualquier contraseña globalmente
    if (!isSuperAdmin) {
      if (isMultiOrg) {
        return NextResponse.json({ 
          success: false, 
          error: 'No puede cambiar la contraseña de un usuario que pertenece a múltiples organizaciones. Solo Super Admin puede hacerlo.' 
        }, { status: 403 });
      }

      if (!userInCurrentOrg) {
        return NextResponse.json({ 
          success: false, 
          error: 'El usuario no pertenece a su organización' 
        }, { status: 403 });
      }
    }

    // 5. Cambiar la contraseña
    const result = await executeTransaction(async (transaction) => {
      // Hash de la nueva contraseña
      const hashedPassword = await bcrypt.hash(body.newPassword, 12);

      // Actualizar contraseña
      const updateRequest = transaction.request();
      updateRequest.input('userId', userId);
      updateRequest.input('passwordHash', hashedPassword);
      updateRequest.input('updatedById', user.id);

      await updateRequest.query(`
        UPDATE users 
        SET password_hash = @passwordHash, 
            updated_at = GETDATE(), 
            updated_by_id = @updatedById
        WHERE id = @userId
      `);

      // Registrar actividad
      const logActivityRequest = transaction.request();
      logActivityRequest.input('adminUserId', user.id);
      logActivityRequest.input('organizationId', user.currentOrganization?.id);
      logActivityRequest.input('action', 'CHANGE_PASSWORD');
      logActivityRequest.input('resourceType', 'USER');
      logActivityRequest.input('resourceId', userId.toString());
      logActivityRequest.input('details', JSON.stringify({
        targetUserEmail: targetUser.email,
        adminEmail: user.email,
        isMultiOrg,
        isSuperAdmin,
        globalReset: isSuperAdmin && isMultiOrg,
        timestamp: new Date().toISOString()
      }));
      logActivityRequest.input('createdById', user.id);
      logActivityRequest.input('updatedById', user.id);

      await logActivityRequest.query(`
        INSERT INTO activity_logs (
          user_id, organization_id, action, resource_type, resource_id, details,
          created_at, updated_at, created_by_id, updated_by_id
        ) 
        VALUES (
          @adminUserId, @organizationId, @action, @resourceType, @resourceId, @details,
          GETDATE(), GETDATE(), @createdById, @updatedById
        )
      `);

      return true;
    });

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Change password API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}