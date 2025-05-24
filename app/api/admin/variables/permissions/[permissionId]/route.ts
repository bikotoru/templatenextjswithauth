import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/utils/sql';
import { verifyAuthFromRequest } from '@/utils/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { permissionId: string } }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Check permission
    if (!user.permissions.includes('variables:manage') && !user.permissions.includes('variable_permissions:edit')) {
      return NextResponse.json({ message: 'Sin permisos para editar permisos de variables' }, { status: 403 });
    }

    const { permissionId } = params;
    const body = await request.json();
    const { can_view, can_edit } = body;

    // Check if permission exists
    const existingPermission = await executeQuery(`
      SELECT id FROM variable_permissions 
      WHERE id = @id AND active = 1
    `, { id: parseInt(permissionId) });

    if (existingPermission.length === 0) {
      return NextResponse.json({ message: 'Permiso no encontrado' }, { status: 404 });
    }

    // Update the permission
    await executeQuery(`
      UPDATE variable_permissions 
      SET can_view = @can_view, can_edit = @can_edit, 
          updated_by = @updated_by, updated_at = GETDATE()
      WHERE id = @id
    `, {
      id: parseInt(permissionId),
      can_view: can_view !== false,
      can_edit: can_edit || false,
      updated_by: user.id
    });

    // Get the updated permission with user/role info
    const updatedPermission = await executeQuery(`
      SELECT 
        vp.id,
        vp.variable_id,
        vp.user_id,
        vp.role_id,
        vp.can_view,
        vp.can_edit,
        vp.created_at,
        vp.updated_at,
        u.name as user_name,
        u.email as user_email,
        r.name as role_name
      FROM variable_permissions vp
      LEFT JOIN users u ON vp.user_id = u.id
      LEFT JOIN roles r ON vp.role_id = r.id
      WHERE vp.id = @id
    `, { id: parseInt(permissionId) });

    return NextResponse.json(updatedPermission[0]);
  } catch (error) {
    console.error('Error updating variable permission:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { permissionId: string } }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Check permission
    if (!user.permissions.includes('variables:manage') && !user.permissions.includes('variable_permissions:delete')) {
      return NextResponse.json({ message: 'Sin permisos para eliminar permisos de variables' }, { status: 403 });
    }

    const { permissionId } = params;

    // Check if permission exists
    const existingPermission = await executeQuery(`
      SELECT id FROM variable_permissions 
      WHERE id = @id AND active = 1
    `, { id: parseInt(permissionId) });

    if (existingPermission.length === 0) {
      return NextResponse.json({ message: 'Permiso no encontrado' }, { status: 404 });
    }

    // Soft delete the permission
    await executeQuery(`
      UPDATE variable_permissions 
      SET active = 0, updated_by = @updated_by, updated_at = GETDATE()
      WHERE id = @id
    `, {
      id: parseInt(permissionId),
      updated_by: user.id
    });

    return NextResponse.json({ message: 'Permiso eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting variable permission:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}