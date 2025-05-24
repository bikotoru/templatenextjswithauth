import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/utils/sql';
import { verifyAuthFromRequest } from '@/utils/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Get the variable and validate it's autoincremental
    const variable = await executeQuery(`
      SELECT 
        sv.id, sv.[key], sv.name, sv.data_type, sv.config,
        sv.is_editable, sv.active
      FROM system_variables sv
      WHERE sv.id = @id AND sv.active = 1
    `, { id: parseInt(id) });

    if (variable.length === 0) {
      return NextResponse.json({ message: 'Variable no encontrada' }, { status: 404 });
    }

    const variableData = variable[0];

    if (variableData.data_type !== 'autoincremental') {
      return NextResponse.json(
        { message: 'Esta variable no es de tipo autoincremental' },
        { status: 400 }
      );
    }

    // Check if user has permission to edit this variable
    const hasPermission = await executeQuery(`
      SELECT 1 FROM (
        -- Direct user permission
        SELECT 1 FROM variable_permissions vp
        WHERE vp.variable_id = @variable_id 
        AND vp.user_id = @user_id 
        AND vp.can_edit = 1 
        AND vp.active = 1
        
        UNION
        
        -- Role-based permission
        SELECT 1 FROM variable_permissions vp
        INNER JOIN user_roles ur ON vp.role_id = ur.role_id
        WHERE vp.variable_id = @variable_id 
        AND ur.user_id = @user_id
        AND vp.can_edit = 1 
        AND vp.active = 1
        AND ur.active = 1
      ) permissions
    `, { 
      variable_id: parseInt(id), 
      user_id: user.id 
    });

    if (hasPermission.length === 0) {
      return NextResponse.json(
        { message: 'Sin permisos para incrementar esta variable' },
        { status: 403 }
      );
    }

    // Parse config
    const config = variableData.config ? 
      (typeof variableData.config === 'string' ? JSON.parse(variableData.config) : variableData.config) 
      : {};

    if (!config.suffix || !config.digits) {
      return NextResponse.json(
        { message: 'Configuración de variable autoincremental inválida' },
        { status: 400 }
      );
    }

    // Get the current maximum value for this variable
    const currentValue = await executeQuery(`
      SELECT TOP 1 current_value 
      FROM variable_values 
      WHERE variable_id = @variable_id 
      AND organization_id = @organization_id
      ORDER BY current_value DESC
    `, { 
      variable_id: parseInt(id),
      organization_id: user.organizationId 
    });

    let nextValue = 1;
    if (currentValue.length > 0) {
      nextValue = currentValue[0].current_value + 1;
    }

    // Generate the formatted value
    const paddedNumber = nextValue.toString().padStart(config.digits, '0');
    const formattedValue = `${config.suffix}${paddedNumber}`;

    // Insert the new value record
    await executeQuery(`
      INSERT INTO variable_values (
        variable_id, organization_id, current_value, formatted_value, 
        created_by, updated_by
      )
      VALUES (
        @variable_id, @organization_id, @current_value, @formatted_value,
        @created_by, @updated_by
      )
    `, {
      variable_id: parseInt(id),
      organization_id: user.organizationId,
      current_value: nextValue,
      formatted_value: formattedValue,
      created_by: user.id,
      updated_by: user.id
    });

    return NextResponse.json({
      variable_id: parseInt(id),
      variable_key: variableData.key,
      variable_name: variableData.name,
      current_value: nextValue,
      formatted_value: formattedValue,
      config
    }, { status: 201 });

  } catch (error) {
    console.error('Error incrementing variable:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Get the variable and validate it's autoincremental
    const variable = await executeQuery(`
      SELECT 
        sv.id, sv.[key], sv.name, sv.data_type, sv.config
      FROM system_variables sv
      WHERE sv.id = @id AND sv.active = 1
    `, { id: parseInt(id) });

    if (variable.length === 0) {
      return NextResponse.json({ message: 'Variable no encontrada' }, { status: 404 });
    }

    const variableData = variable[0];

    if (variableData.data_type !== 'autoincremental') {
      return NextResponse.json(
        { message: 'Esta variable no es de tipo autoincremental' },
        { status: 400 }
      );
    }

    // Check if user has permission to view this variable
    const hasPermission = await executeQuery(`
      SELECT 1 FROM (
        -- Direct user permission
        SELECT 1 FROM variable_permissions vp
        WHERE vp.variable_id = @variable_id 
        AND vp.user_id = @user_id 
        AND vp.can_view = 1 
        AND vp.active = 1
        
        UNION
        
        -- Role-based permission
        SELECT 1 FROM variable_permissions vp
        INNER JOIN user_roles ur ON vp.role_id = ur.role_id
        WHERE vp.variable_id = @variable_id 
        AND ur.user_id = @user_id
        AND vp.can_view = 1 
        AND vp.active = 1
        AND ur.active = 1
      ) permissions
    `, { 
      variable_id: parseInt(id), 
      user_id: user.id 
    });

    if (hasPermission.length === 0) {
      return NextResponse.json(
        { message: 'Sin permisos para ver esta variable' },
        { status: 403 }
      );
    }

    // Get the current value and history
    const currentValue = await executeQuery(`
      SELECT TOP 1 current_value, formatted_value, created_at
      FROM variable_values 
      WHERE variable_id = @variable_id 
      AND organization_id = @organization_id
      ORDER BY current_value DESC
    `, { 
      variable_id: parseInt(id),
      organization_id: user.organizationId 
    });

    // Parse config
    const config = variableData.config ? 
      (typeof variableData.config === 'string' ? JSON.parse(variableData.config) : variableData.config) 
      : {};

    const result = {
      variable_id: parseInt(id),
      variable_key: variableData.key,
      variable_name: variableData.name,
      config,
      current_value: currentValue.length > 0 ? currentValue[0].current_value : 0,
      formatted_value: currentValue.length > 0 ? currentValue[0].formatted_value : null,
      last_increment: currentValue.length > 0 ? currentValue[0].created_at : null
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error getting variable increment info:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}