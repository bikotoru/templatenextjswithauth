import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/utils/sql';
import { verifyAuthFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Get variables that the user has permission to view
    const variables = await executeQuery(`
      SELECT DISTINCT
        sv.id,
        sv.group_id,
        sv.[key],
        sv.name,
        sv.description,
        sv.data_type,
        sv.category,
        sv.is_required,
        sv.is_editable,
        sv.config,
        vg.name as group_name,
        CASE 
          WHEN vp_user.can_edit = 1 OR vp_role.can_edit = 1 THEN 1 
          ELSE 0 
        END as can_edit,
        CASE 
          WHEN vp_user.can_view = 1 OR vp_role.can_view = 1 THEN 1 
          ELSE 0 
        END as can_view
      FROM system_variables sv
      LEFT JOIN variable_groups vg ON sv.group_id = vg.id AND vg.active = 1
      LEFT JOIN variable_permissions vp_user ON sv.id = vp_user.variable_id 
        AND vp_user.user_id = @user_id 
        AND vp_user.active = 1
      LEFT JOIN variable_permissions vp_role ON sv.id = vp_role.variable_id 
        AND vp_role.role_id IN (
          SELECT role_id FROM user_roles 
          WHERE user_id = @user_id AND active = 1
        )
        AND vp_role.active = 1
      WHERE sv.active = 1
      AND (vp_user.can_view = 1 OR vp_role.can_view = 1)
      ORDER BY vg.name NULLS LAST, sv.name
    `, { user_id: user.id });

    // Get current values for each variable
    const variableIds = variables.map(v => v.id);
    let currentValues = [];

    if (variableIds.length > 0) {
      // Get organization variable values
      currentValues = await executeQuery(`
        SELECT 
          ov.system_variable_id as variable_id,
          ov.value,
          ov.updated_at
        FROM organization_variables ov
        WHERE ov.system_variable_id IN (${variableIds.map((_, i) => `@id${i}`).join(',')})
        AND ov.organization_id = @organization_id
      `, {
        organization_id: user.organization_id,
        ...variableIds.reduce((acc, id, index) => ({ ...acc, [`id${index}`]: id }), {})
      });

      // For autoincremental variables, get the latest formatted value
      const autoincrementalVars = variables.filter(v => v.data_type === 'autoincremental');
      if (autoincrementalVars.length > 0) {
        const autoincrementalValues = await executeQuery(`
          SELECT 
            vv.variable_id,
            vv.current_value,
            vv.formatted_value,
            vv.created_at as updated_at
          FROM variable_values vv
          INNER JOIN (
            SELECT variable_id, MAX(current_value) as max_value
            FROM variable_values
            WHERE variable_id IN (${autoincrementalVars.map((_, i) => `@autoId${i}`).join(',')})
            AND organization_id = @organization_id
            GROUP BY variable_id
          ) latest ON vv.variable_id = latest.variable_id AND vv.current_value = latest.max_value
          WHERE vv.organization_id = @organization_id
        `, {
          organization_id: user.organization_id,
          ...autoincrementalVars.reduce((acc, v, index) => ({ ...acc, [`autoId${index}`]: v.id }), {})
        });

        // Merge autoincremental values
        currentValues = currentValues.concat(
          autoincrementalValues.map(av => ({
            variable_id: av.variable_id,
            value: av.formatted_value,
            updated_at: av.updated_at
          }))
        );
      }
    }

    // Create a map of current values
    const valueMap = currentValues.reduce((acc, cv) => {
      acc[cv.variable_id] = {
        value: cv.value,
        updated_at: cv.updated_at
      };
      return acc;
    }, {});

    // Combine variables with their current values
    const result = variables.map(variable => {
      const currentValue = valueMap[variable.id];
      const config = variable.config ? 
        (typeof variable.config === 'string' ? JSON.parse(variable.config) : variable.config) 
        : {};

      return {
        ...variable,
        config,
        current_value: currentValue?.value || variable.default_value || null,
        last_updated: currentValue?.updated_at || null
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching user variables:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { variable_id, value } = body;

    if (!variable_id || value === undefined) {
      return NextResponse.json(
        { message: 'variable_id y value son requeridos' },
        { status: 400 }
      );
    }

    // Get the variable and check permissions
    const variable = await executeQuery(`
      SELECT 
        sv.id,
        sv.[key],
        sv.name,
        sv.data_type,
        sv.is_editable,
        sv.config,
        CASE 
          WHEN vp_user.can_edit = 1 OR vp_role.can_edit = 1 THEN 1 
          ELSE 0 
        END as can_edit
      FROM system_variables sv
      LEFT JOIN variable_permissions vp_user ON sv.id = vp_user.variable_id 
        AND vp_user.user_id = @user_id 
        AND vp_user.active = 1
      LEFT JOIN variable_permissions vp_role ON sv.id = vp_role.variable_id 
        AND vp_role.role_id IN (
          SELECT role_id FROM user_roles 
          WHERE user_id = @user_id AND active = 1
        )
        AND vp_role.active = 1
      WHERE sv.id = @variable_id AND sv.active = 1
      AND (vp_user.can_edit = 1 OR vp_role.can_edit = 1)
    `, { 
      user_id: user.id, 
      variable_id: parseInt(variable_id) 
    });

    if (variable.length === 0) {
      return NextResponse.json(
        { message: 'Variable no encontrada o sin permisos de edición' },
        { status: 404 }
      );
    }

    const variableData = variable[0];

    if (!variableData.is_editable) {
      return NextResponse.json(
        { message: 'Esta variable no es editable' },
        { status: 400 }
      );
    }

    if (variableData.data_type === 'autoincremental') {
      return NextResponse.json(
        { message: 'Las variables autoincrementales no se pueden editar directamente' },
        { status: 400 }
      );
    }

    // Validate value based on data type
    let validatedValue = value;
    switch (variableData.data_type) {
      case 'number':
        if (isNaN(Number(value))) {
          return NextResponse.json(
            { message: 'El valor debe ser un número válido' },
            { status: 400 }
          );
        }
        validatedValue = Number(value);
        break;
      case 'boolean':
        validatedValue = Boolean(value);
        break;
      case 'json':
        try {
          if (typeof value === 'string') {
            JSON.parse(value);
          }
        } catch {
          return NextResponse.json(
            { message: 'El valor debe ser un JSON válido' },
            { status: 400 }
          );
        }
        break;
    }

    // Check if organization variable already exists
    const existingOrgVar = await executeQuery(`
      SELECT id FROM organization_variables 
      WHERE system_variable_id = @variable_id 
      AND organization_id = @organization_id
    `, { 
      variable_id: parseInt(variable_id),
      organization_id: user.organization_id 
    });

    if (existingOrgVar.length > 0) {
      // Update existing value
      await executeQuery(`
        UPDATE organization_variables 
        SET value = @value, updated_by = @updated_by, updated_at = GETDATE()
        WHERE system_variable_id = @variable_id 
        AND organization_id = @organization_id
      `, {
        value: typeof validatedValue === 'object' ? JSON.stringify(validatedValue) : String(validatedValue),
        variable_id: parseInt(variable_id),
        organization_id: user.organization_id,
        updated_by: user.id
      });
    } else {
      // Create new value
      await executeQuery(`
        INSERT INTO organization_variables (
          system_variable_id, organization_id, value, created_by, updated_by
        )
        VALUES (
          @variable_id, @organization_id, @value, @created_by, @updated_by
        )
      `, {
        variable_id: parseInt(variable_id),
        organization_id: user.organization_id,
        value: typeof validatedValue === 'object' ? JSON.stringify(validatedValue) : String(validatedValue),
        created_by: user.id,
        updated_by: user.id
      });
    }

    return NextResponse.json({
      variable_id: parseInt(variable_id),
      variable_key: variableData.key,
      variable_name: variableData.name,
      value: validatedValue,
      message: 'Variable actualizada correctamente'
    });

  } catch (error) {
    console.error('Error updating user variable:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}