import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/utils/sql';
import { verifyAuthFromRequest } from '@/utils/auth';

// DELETE /api/admin/organizations/[id]/users/[userId] - Remover usuario de organización
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    // Verificar autenticación y permisos
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo Super Admin puede remover usuarios de organizaciones
    if (!user.roles.includes('Super Admin')) {
      return NextResponse.json(
        { error: 'Solo Super Admin puede remover usuarios de organizaciones' },
        { status: 403 }
      );
    }

    const organizationId = params.id;
    const userId = parseInt(params.userId);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario pertenece a la organización
    const checkQuery = `
      SELECT id 
      FROM user_organizations 
      WHERE user_id = @userId AND organization_id = @organizationId AND active = 1
    `;

    const checkResult = await executeQuery<{ id: number }>(checkQuery, { 
      userId, 
      organizationId 
    });

    if (!checkResult.success) {
      return NextResponse.json(
        { error: 'Error al verificar la relación usuario-organización' },
        { status: 500 }
      );
    }

    if (checkResult.data.length === 0) {
      return NextResponse.json(
        { error: 'El usuario no pertenece a esta organización' },
        { status: 404 }
      );
    }

    // Remover usuario de la organización (marcar como inactivo)
    const removeQuery = `
      UPDATE user_organizations 
      SET 
        active = 0,
        updated_at = GETDATE(),
        updated_by_id = @currentUserId
      WHERE user_id = @userId AND organization_id = @organizationId
    `;

    const removeResult = await executeQuery(removeQuery, { 
      userId, 
      organizationId,
      currentUserId: user.id
    });

    if (!removeResult.success) {
      return NextResponse.json(
        { error: 'Error al remover usuario de la organización' },
        { status: 500 }
      );
    }

    // También remover roles específicos de esta organización
    const removeRolesQuery = `
      DELETE FROM user_role_assignments 
      WHERE user_id = @userId AND organization_id = @organizationId
    `;

    await executeQuery(removeRolesQuery, { userId, organizationId });

    // También remover permisos específicos de esta organización
    const removePermissionsQuery = `
      DELETE FROM user_permission_assignments 
      WHERE user_id = @userId AND organization_id = @organizationId
    `;

    await executeQuery(removePermissionsQuery, { userId, organizationId });

    return NextResponse.json({
      success: true,
      message: 'Usuario removido de la organización correctamente'
    });

  } catch (error) {
    console.error('Error in DELETE /api/admin/organizations/[id]/users/[userId]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}