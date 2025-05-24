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
    if (!user.permissions.includes('system_variables:view')) {
      return NextResponse.json({ message: 'Sin permisos para ver variables del sistema' }, { status: 403 });
    }

    // Get the system variable with group information
    const variable = await executeQuery(
      `SELECT 
        sv.id, sv.group_id, sv.[key], sv.name, sv.description, sv.default_value, sv.data_type, sv.category,
        sv.is_required, sv.is_editable, sv.config, sv.created_at, sv.updated_at,
        vg.name as group_name
      FROM system_variables sv
      LEFT JOIN variable_groups vg ON sv.group_id = vg.id AND vg.active = 1
      WHERE sv.id = @id AND sv.active = 1`,
      { id: parseInt(id) }
    );

    if (variable.length === 0) {
      return NextResponse.json({ message: 'Variable no encontrada' }, { status: 404 });
    }

    // Parse config JSON
    const result = {
      ...variable[0],
      config: variable[0].config ? (typeof variable[0].config === 'string' ? JSON.parse(variable[0].config) : variable[0].config) : {}
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching system variable:', error);
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
    if (!user.permissions.includes('system_variables:edit')) {
      return NextResponse.json({ message: 'Sin permisos para editar variables del sistema' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, default_value, data_type, category, is_required, is_editable, config, group_id } = body;

    // Validate required fields
    if (!name || !description || !data_type || !category) {
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

    // Check if variable exists
    const existingVariable = await executeQuery(
      'SELECT id FROM system_variables WHERE id = @id AND active = 1',
      { id: parseInt(id) }
    );

    if (existingVariable.length === 0) {
      return NextResponse.json({ message: 'Variable no encontrada' }, { status: 404 });
    }

    // Update the variable
    await executeQuery(
      `UPDATE system_variables 
      SET 
        name = @name,
        description = @description,
        default_value = @default_value,
        data_type = @data_type,
        category = @category,
        is_required = @is_required,
        is_editable = @is_editable,
        config = @config,
        group_id = @group_id,
        updated_by = @updated_by,
        updated_at = GETDATE()
      WHERE id = @id`,
      {
        id: parseInt(id),
        name,
        description,
        default_value: default_value || '',
        data_type,
        category,
        is_required: is_required || false,
        is_editable: is_editable !== false,
        config: config ? JSON.stringify(config) : null,
        group_id: group_id || null,
        updated_by: user.id
      }
    );

    // Get the updated variable with group information
    const updatedVariable = await executeQuery(
      `SELECT 
        sv.id, sv.group_id, sv.[key], sv.name, sv.description, sv.default_value, sv.data_type, sv.category,
        sv.is_required, sv.is_editable, sv.config, sv.created_at, sv.updated_at,
        vg.name as group_name
      FROM system_variables sv
      LEFT JOIN variable_groups vg ON sv.group_id = vg.id AND vg.active = 1
      WHERE sv.id = @id`,
      { id: parseInt(id) }
    );

    const result = {
      ...updatedVariable[0],
      config: updatedVariable[0].config ? (typeof updatedVariable[0].config === 'string' ? JSON.parse(updatedVariable[0].config) : updatedVariable[0].config) : {}
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating system variable:', error);
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
    if (!user.permissions.includes('system_variables:delete')) {
      return NextResponse.json({ message: 'Sin permisos para eliminar variables del sistema' }, { status: 403 });
    }

    // Check if variable exists
    const existingVariable = await executeQuery(
      'SELECT id FROM system_variables WHERE id = @id AND active = 1',
      { id: parseInt(id) }
    );

    if (existingVariable.length === 0) {
      return NextResponse.json({ message: 'Variable no encontrada' }, { status: 404 });
    }

    // Soft delete the variable (preserve data integrity)
    await executeQuery(
      `UPDATE system_variables 
       SET active = 0, updated_by = @updated_by, updated_at = GETDATE()
       WHERE id = @id`,
      {
        id: parseInt(id),
        updated_by: user.id
      }
    );

    return NextResponse.json({ message: 'Variable eliminada correctamente' });
  } catch (error) {
    console.error('Error deleting system variable:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}