import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/utils/sql';
import { verifyAuthFromRequest } from '@/utils/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Check permission
    if (!user.permissions.includes('variables:manage') && !user.permissions.includes('variable_permissions:view')) {
      return NextResponse.json({ message: 'Sin permisos para ver permisos de variables' }, { status: 403 });
    }

    const { id } = params;

    // Check if variable exists
    const variable = await executeQuery(`
      SELECT id, [key], name FROM system_variables 
      WHERE id = @id AND active = 1
    `, { id: parseInt(id) });

    if (variable.length === 0) {
      return NextResponse.json({ message: 'Variable no encontrada' }, { status: 404 });
    }

    // Get variable permissions for users and roles
    const permissions = await executeQuery(`
      SELECT 
        vp.id,
        vp.variable_id,
        vp.user_id,
        vp.role_id,
        vp.can_view,
        vp.can_edit,
        vp.created_at,
        u.name as user_name,
        u.email as user_email,
        r.name as role_name
      FROM variable_permissions vp
      LEFT JOIN users u ON vp.user_id = u.id
      LEFT JOIN roles r ON vp.role_id = r.id
      WHERE vp.variable_id = @variable_id AND vp.active = 1
      ORDER BY u.name, r.name
    `, { variable_id: parseInt(id) });

    return NextResponse.json({
      variable: variable[0],
      permissions
    });
  } catch (error) {
    console.error('Error fetching variable permissions:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Check permission
    if (!user.permissions.includes('variables:manage') && !user.permissions.includes('variable_permissions:create')) {
      return NextResponse.json({ message: 'Sin permisos para crear permisos de variables' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { user_id, role_id, can_view, can_edit } = body;

    // Validate required fields
    if ((!user_id && !role_id) || (user_id && role_id)) {
      return NextResponse.json(
        { message: 'Debe especificar exactamente un usuario o un rol' },
        { status: 400 }
      );
    }

    // Check if variable exists
    const variable = await executeQuery(`
      SELECT id FROM system_variables 
      WHERE id = @id AND active = 1
    `, { id: parseInt(id) });

    if (variable.length === 0) {
      return NextResponse.json({ message: 'Variable no encontrada' }, { status: 404 });
    }

    // Check if user or role exists
    if (user_id) {
      const userExists = await executeQuery(
        'SELECT id FROM users WHERE id = @user_id',
        { user_id }
      );
      if (userExists.length === 0) {
        return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
      }
    }

    if (role_id) {
      const roleExists = await executeQuery(
        'SELECT id FROM roles WHERE id = @role_id',
        { role_id }
      );
      if (roleExists.length === 0) {
        return NextResponse.json({ message: 'Rol no encontrado' }, { status: 404 });
      }
    }

    // Check if permission already exists
    const existingPermission = await executeQuery(`
      SELECT id FROM variable_permissions 
      WHERE variable_id = @variable_id 
      AND ${user_id ? 'user_id = @user_id' : 'role_id = @role_id'}
      AND active = 1
    `, user_id ? { variable_id: parseInt(id), user_id } : { variable_id: parseInt(id), role_id });

    if (existingPermission.length > 0) {
      return NextResponse.json(
        { message: 'Ya existe un permiso para este usuario/rol en esta variable' },
        { status: 400 }
      );
    }

    // Create the permission
    await executeQuery(`
      INSERT INTO variable_permissions (
        variable_id, user_id, role_id, can_view, can_edit, created_by, updated_by
      )
      VALUES (
        @variable_id, @user_id, @role_id, @can_view, @can_edit, @created_by, @updated_by
      )
    `, {
      variable_id: parseInt(id),
      user_id: user_id || null,
      role_id: role_id || null,
      can_view: can_view !== false,
      can_edit: can_edit || false,
      created_by: user.id,
      updated_by: user.id
    });

    // Get the created permission with user/role info
    const createdPermission = await executeQuery(`
      SELECT 
        vp.id,
        vp.variable_id,
        vp.user_id,
        vp.role_id,
        vp.can_view,
        vp.can_edit,
        vp.created_at,
        u.name as user_name,
        u.email as user_email,
        r.name as role_name
      FROM variable_permissions vp
      LEFT JOIN users u ON vp.user_id = u.id
      LEFT JOIN roles r ON vp.role_id = r.id
      WHERE vp.variable_id = @variable_id 
      AND ${user_id ? 'vp.user_id = @user_id' : 'vp.role_id = @role_id'}
      AND vp.active = 1
    `, user_id ? { variable_id: parseInt(id), user_id } : { variable_id: parseInt(id), role_id });

    return NextResponse.json(createdPermission[0], { status: 201 });
  } catch (error) {
    console.error('Error creating variable permission:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}