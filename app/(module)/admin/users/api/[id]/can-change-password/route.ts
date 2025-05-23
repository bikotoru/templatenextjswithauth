import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { executeQuerySingle } from '@/utils/sql';

export async function GET(
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

    // Verificar si el usuario existe y está activo
    const targetUser = await executeQuerySingle<{ id: number; active: boolean }>(
      'SELECT id, active FROM users WHERE id = @userId',
      { userId }
    );

    if (!targetUser || !targetUser.active) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar si el usuario está en múltiples organizaciones
    const orgCount = await executeQuerySingle<{ count: number }>(
      `SELECT COUNT(DISTINCT organization_id) as count 
       FROM user_organizations 
       WHERE user_id = @userId AND active = 1`,
      { userId }
    );

    const isMultiOrg = (orgCount?.count || 0) > 1;

    // Verificar si el usuario pertenece a la organización del admin actual
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

    // Super Admin puede cambiar cualquier contraseña globalmente
    // Otros admins solo pueden cambiar contraseñas de usuarios en su organización y que no sean multi-org
    const canChangePassword = isSuperAdmin || (!isMultiOrg && userInCurrentOrg);

    return NextResponse.json({
      success: true,
      data: {
        canChangePassword,
        isMultiOrg,
        userInCurrentOrg,
        isSuperAdmin,
        reason: !canChangePassword 
          ? (isMultiOrg ? 'Usuario pertenece a múltiples organizaciones (solo Super Admin puede resetear)' : 'Usuario no pertenece a su organización')
          : null
      }
    });

  } catch (error) {
    console.error('Can change password API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}