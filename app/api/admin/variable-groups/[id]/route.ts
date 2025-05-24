import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/utils/sql';
import { verifyAuthFromRequest } from '@/utils/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Check permission
    if (!user.permissions.includes('variable_groups:view') && !user.permissions.includes('variables:manage')) {
      return NextResponse.json({ message: 'Sin permisos para ver grupos de variables' }, { status: 403 });
    }

    // Get group with variables
    const groupData = await executeQuery(`
      SELECT 
        vg.id,
        vg.name,
        vg.description,
        vg.organization_id,
        vg.active,
        vg.created_at,
        vg.updated_at,
        o.name as organization_name
      FROM variable_groups vg
      LEFT JOIN organizations o ON vg.organization_id = o.id
      WHERE vg.id = @id AND vg.active = 1
    `, { id: parseInt(id) });

    if (groupData.length === 0) {
      return NextResponse.json({ message: 'Grupo no encontrado' }, { status: 404 });
    }

    // Get variables in this group
    const variables = await executeQuery(`
      SELECT 
        id, [key], name, description, data_type, default_value, config, 
        category, is_required, is_editable, created_at
      FROM system_variables
      WHERE group_id = @group_id AND active = 1
      ORDER BY name
    `, { group_id: parseInt(id) });

    // Parse config JSON for each variable
    const parsedVariables = variables.map(v => ({
      ...v,
      config: v.config ? (typeof v.config === 'string' ? JSON.parse(v.config) : v.config) : {}
    }));

    const result = {
      ...groupData[0],
      variables: parsedVariables
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching variable group:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Check permission
    if (!user.permissions.includes('variable_groups:edit') && !user.permissions.includes('variables:manage')) {
      return NextResponse.json({ message: 'Sin permisos para editar grupos de variables' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { message: 'El nombre del grupo es requerido' },
        { status: 400 }
      );
    }

    // Check if group exists
    const existingGroup = await executeQuery(`
      SELECT id, organization_id FROM variable_groups WHERE id = @id AND active = 1
    `, { id: parseInt(id) });

    if (existingGroup.length === 0) {
      return NextResponse.json({ message: 'Grupo no encontrado' }, { status: 404 });
    }

    // Check if name conflicts with another group in same scope
    const nameConflict = await executeQuery(`
      SELECT id FROM variable_groups 
      WHERE name = @name 
      AND id != @id
      AND ((organization_id IS NULL AND @organization_id IS NULL) OR organization_id = @organization_id)
      AND active = 1
    `, { 
      name, 
      id: parseInt(id),
      organization_id: existingGroup[0].organization_id 
    });

    if (nameConflict.length > 0) {
      return NextResponse.json(
        { message: 'Ya existe otro grupo con ese nombre en este contexto' },
        { status: 400 }
      );
    }

    // Update the group
    const result = await executeQuery(`
      UPDATE variable_groups 
      SET 
        name = @name,
        description = @description,
        updated_at = GETDATE(),
        updated_by_id = @updated_by_id
      OUTPUT INSERTED.*
      WHERE id = @id
    `, {
      id: parseInt(id),
      name,
      description: description || null,
      updated_by_id: user.id
    });

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating variable group:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Check permission
    if (!user.permissions.includes('variable_groups:delete') && !user.permissions.includes('variables:manage')) {
      return NextResponse.json({ message: 'Sin permisos para eliminar grupos de variables' }, { status: 403 });
    }

    // Check if group has variables
    const variables = await executeQuery(`
      SELECT COUNT(*) as count FROM system_variables 
      WHERE group_id = @group_id AND active = 1
    `, { group_id: parseInt(id) });

    if (variables[0].count > 0) {
      return NextResponse.json(
        { message: 'No se puede eliminar un grupo que contiene variables. Primero elimine o reasigne las variables.' },
        { status: 400 }
      );
    }

    // Soft delete the group
    await executeQuery(`
      UPDATE variable_groups 
      SET 
        active = 0,
        updated_at = GETDATE(),
        updated_by_id = @updated_by_id
      WHERE id = @id
    `, {
      id: parseInt(id),
      updated_by_id: user.id
    });

    return NextResponse.json({ message: 'Grupo eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting variable group:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}