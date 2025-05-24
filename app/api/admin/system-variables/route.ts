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

    // Get all system variables
    const variables = await executeQuery(
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
      ORDER BY category, name`
    );

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
    const { key, name, description, default_value, data_type, category, is_required, is_editable, config } = body;

    // Validate required fields
    if (!key || !name || !description || !data_type || !category) {
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
    await executeQuery(
      `INSERT INTO system_variables (
        [key], name, description, default_value, data_type, category, is_required, is_editable, config,
        created_by, updated_by
      )
      VALUES (
        @key, @name, @description, @default_value, @data_type, @category, 
        @is_required, @is_editable, @config, @created_by, @updated_by
      )`,
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
        created_by: user.id,
        updated_by: user.id
      }
    );

    // Get the created variable
    const createdVariable = await executeQuery(
      `SELECT 
        id, [key], name, description, default_value, data_type, category, 
        is_required, is_editable, config, created_at, updated_at
      FROM system_variables 
      WHERE [key] = @key`,
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