import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/utils/sql';
import { verifyAuthFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Check permission
    if (!user.permissions.includes('system_variables:view')) {
      return NextResponse.json({ message: 'Sin permisos para ver variables del sistema' }, { status: 403 });
    }

    // Get all system variables with group information
    const variables = await executeQuery(`
      SELECT 
        sv.id,
        sv.group_id,
        sv.[key],
        sv.name,
        sv.description,
        sv.default_value,
        sv.data_type,
        sv.category,
        sv.is_required,
        sv.is_editable,
        sv.config,
        sv.created_at,
        sv.updated_at,
        vg.name as group_name
      FROM system_variables sv
      LEFT JOIN variable_groups vg ON sv.group_id = vg.id AND vg.active = 1
      WHERE sv.active = 1
      ORDER BY CASE WHEN vg.name IS NULL THEN 1 ELSE 0 END, vg.name, sv.name
    `);

    // Parse config JSON for each variable
    const parsedVariables = variables.map(v => ({
      ...v,
      config: v.config ? (typeof v.config === 'string' ? JSON.parse(v.config) : v.config) : {}
    }));

    return NextResponse.json(parsedVariables);
  } catch (error) {
    console.error('Error fetching system variables:', error);
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

    // Check permission
    if (!user.permissions.includes('system_variables:create')) {
      return NextResponse.json({ message: 'Sin permisos para crear variables del sistema' }, { status: 403 });
    }

    const body = await request.json();
    const { key, name, description, default_value, data_type, category, is_required, is_editable, config, group_id } = body;

    // Validate required fields
    if (!key || !name || !description || !data_type || !category) {
      return NextResponse.json(
        { message: 'Todos los campos requeridos deben ser proporcionados' },
        { status: 400 }
      );
    }

    // Validate data_type
    const validDataTypes = ['string', 'number', 'boolean', 'json', 'autoincremental'];
    if (!validDataTypes.includes(data_type)) {
      return NextResponse.json(
        { message: 'Tipo de dato inválido' },
        { status: 400 }
      );
    }

    // Validate group_id if provided
    if (group_id) {
      const groupExists = await executeQuery(
        'SELECT id FROM variable_groups WHERE id = @group_id AND active = 1',
        { group_id }
      );
      if (groupExists.length === 0) {
        return NextResponse.json(
          { message: 'Grupo de variables no encontrado' },
          { status: 400 }
        );
      }
    }

    // Special validation for autoincremental type
    if (data_type === 'autoincremental') {
      if (!config || !config.suffix || !config.digits) {
        return NextResponse.json(
          { message: 'Variables autoincrementales requieren configuración de sufijo y dígitos' },
          { status: 400 }
        );
      }
      if (typeof config.digits !== 'number' || config.digits < 1 || config.digits > 20) {
        return NextResponse.json(
          { message: 'El número de dígitos debe ser entre 1 y 20' },
          { status: 400 }
        );
      }
    }

    // Check if key already exists
    const existingVariable = await executeQuery(
      'SELECT id FROM system_variables WHERE [key] = @key',
      { key }
    );

    if (existingVariable.length > 0) {
      return NextResponse.json(
        { message: 'Ya existe una variable con esa clave' },
        { status: 400 }
      );
    }

    // Create the variable
    const insertResult = await executeQuery(
      `INSERT INTO system_variables (
        [key], name, description, default_value, data_type, category, is_required, is_editable, config, group_id,
        created_by, updated_by
      )
      VALUES (
        @key, @name, @description, @default_value, @data_type, @category, 
        @is_required, @is_editable, @config, @group_id, @created_by, @updated_by
      );
      SELECT SCOPE_IDENTITY() as id;`,
      {
        key,
        name,
        description,
        default_value: default_value || '',
        data_type,
        category,
        is_required: is_required || false,
        is_editable: is_editable !== false,
        config: config ? JSON.stringify(config) : null,
        group_id: group_id || null,
        created_by: user.id,
        updated_by: user.id
      }
    );

    const variableId = insertResult[0]?.id;

    // Auto-create permissions for variable access
    if (variableId) {
      try {
        await executeQuery(`
          INSERT INTO permissions (name, description, module, action, resource)
          VALUES 
            (@view_permission, @view_description, 'variables', 'view', @variable_key),
            (@edit_permission, @edit_description, 'variables', 'edit', @variable_key)
        `, {
          view_permission: `variable:view:${key}`,
          view_description: `Ver variable ${name}`,
          edit_permission: `variable:edit:${key}`,
          edit_description: `Editar variable ${name}`,
          variable_key: key
        });
      } catch (permissionError) {
        console.warn('Error creating auto permissions for variable:', permissionError);
      }
    }

    // Get the created variable with group information
    const createdVariable = await executeQuery(
      `SELECT 
        sv.id, sv.group_id, sv.[key], sv.name, sv.description, sv.default_value, sv.data_type, sv.category, 
        sv.is_required, sv.is_editable, sv.config, sv.created_at, sv.updated_at,
        vg.name as group_name
      FROM system_variables sv
      LEFT JOIN variable_groups vg ON sv.group_id = vg.id AND vg.active = 1
      WHERE sv.[key] = @key`,
      { key }
    );

    const result = {
      ...createdVariable[0],
      config: createdVariable[0].config ? (typeof createdVariable[0].config === 'string' ? JSON.parse(createdVariable[0].config) : createdVariable[0].config) : {}
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating system variable:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}