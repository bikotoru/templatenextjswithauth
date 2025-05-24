import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeQuerySingle } from '@/utils/sql';
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

    // Get the system variable
    const variable = await executeQuery(
      `SELECT 
        id,
        [key],
        name,
        description,
        default_value,
        data_type,
        category,
        is_required,
        is_editable,
        config,
        created_at,
        updated_at
      FROM system_variables 
      WHERE id = ?`,
      [id]
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
    const { name, description, default_value, data_type, category, is_required, is_editable, config } = body;

    // Validate required fields
    if (!name || !description || !data_type || !category) {
      return NextResponse.json(
        { message: 'Todos los campos requeridos deben ser proporcionados' },
        { status: 400 }
      );
    }

    // Validate data_type
    const validDataTypes = ['string', 'number', 'boolean', 'json'];
    if (!validDataTypes.includes(data_type)) {
      return NextResponse.json(
        { message: 'Tipo de dato inválido' },
        { status: 400 }
      );
    }

    // Check if variable exists
    const existingVariable = await executeQuery(
      'SELECT id FROM system_variables WHERE id = @id',
      { id }
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
        updated_by = @updated_by,
        updated_at = GETDATE()
      WHERE id = @id`,
      {
        id,
        name,
        description,
        default_value: default_value || '',
        data_type,
        category,
        is_required: is_required || false,
        is_editable: is_editable !== false,
        config: config ? JSON.stringify(config) : null,
        updated_by: user.id
      }
    );

    // Get the updated variable
    const updatedVariable = await executeQuery(
      `SELECT 
        id, [key], name, description, default_value, data_type, category, 
        is_required, is_editable, config, created_at, updated_at
      FROM system_variables 
      WHERE id = @id`,
      { id }
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
      'SELECT id FROM system_variables WHERE id = @id',
      { id }
    );

    if (existingVariable.length === 0) {
      return NextResponse.json({ message: 'Variable no encontrada' }, { status: 404 });
    }

    // Delete organization variable values first
    await executeQuery(
      'DELETE FROM organization_variables WHERE system_variable_id = @id',
      { id }
    );

    // Delete the system variable
    await executeQuery(
      'DELETE FROM system_variables WHERE id = @id',
      { id }
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