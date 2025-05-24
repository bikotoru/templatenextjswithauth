import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/utils/sql';
import { verifyAuthFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Check permission - Solo super admin puede gestionar grupos
    if (!user.permissions.includes('variable_groups:view') && !user.permissions.includes('variables:manage')) {
      return NextResponse.json({ message: 'Sin permisos para ver grupos de variables' }, { status: 403 });
    }

    // Get all variable groups
    const groups = await executeQuery(`
      SELECT 
        vg.id,
        vg.name,
        vg.description,
        vg.organization_id,
        vg.active,
        vg.created_at,
        vg.updated_at,
        COUNT(sv.id) as variable_count,
        o.name as organization_name
      FROM variable_groups vg
      LEFT JOIN system_variables sv ON vg.id = sv.group_id AND sv.active = 1
      LEFT JOIN organizations o ON vg.organization_id = o.id
      WHERE vg.active = 1
      GROUP BY vg.id, vg.name, vg.description, vg.organization_id, vg.active, vg.created_at, vg.updated_at, o.name
      ORDER BY vg.organization_id NULLS FIRST, vg.name
    `);

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching variable groups:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Check permission - Solo super admin puede crear grupos
    if (!user.permissions.includes('variable_groups:create') && !user.permissions.includes('variables:manage')) {
      return NextResponse.json({ message: 'Sin permisos para crear grupos de variables' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, organization_id } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { message: 'El nombre del grupo es requerido' },
        { status: 400 }
      );
    }

    // Check if group name already exists in the same scope (org or global)
    const existingGroup = await executeQuery(`
      SELECT id FROM variable_groups 
      WHERE name = @name 
      AND ((organization_id IS NULL AND @organization_id IS NULL) OR organization_id = @organization_id)
      AND active = 1
    `, { name, organization_id: organization_id || null });

    if (existingGroup.length > 0) {
      return NextResponse.json(
        { message: 'Ya existe un grupo con ese nombre en este contexto' },
        { status: 400 }
      );
    }

    // Create the group
    const result = await executeQuery(`
      INSERT INTO variable_groups (
        name, description, organization_id, active, created_at, updated_at, created_by_id, updated_by_id
      )
      OUTPUT INSERTED.*
      VALUES (
        @name, @description, @organization_id, 1, GETDATE(), GETDATE(), @created_by_id, @updated_by_id
      )
    `, {
      name,
      description: description || null,
      organization_id: organization_id || null,
      created_by_id: user.id,
      updated_by_id: user.id
    });

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating variable group:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}