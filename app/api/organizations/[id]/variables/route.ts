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

    // Check if user belongs to this organization or has admin permissions
    if (user.organization_id !== id && !user.permissions.includes('organizations:view_all')) {
      return NextResponse.json({ message: 'Sin permisos para acceder a esta organización' }, { status: 403 });
    }

    // Get organization variables with system variable details
    const variables = await executeQuery(
      `SELECT 
        ov.id,
        ov.system_variable_id,
        ov.value,
        sv.[key],
        sv.name,
        sv.description,
        sv.default_value,
        sv.data_type,
        sv.category,
        sv.is_required,
        sv.is_editable,
        sv.config
      FROM organization_variables ov
      INNER JOIN system_variables sv ON ov.system_variable_id = sv.id
      WHERE ov.organization_id = @organization_id
      ORDER BY sv.category, sv.name`,
      { organization_id: id }
    );

    // Transform the data to include system variable details
    const result = variables.map(v => ({
      id: v.id,
      system_variable_id: v.system_variable_id,
      value: v.value,
      system_variable: {
        id: v.system_variable_id,
        key: v.key,
        name: v.name,
        description: v.description,
        default_value: v.default_value,
        data_type: v.data_type,
        category: v.category,
        is_required: v.is_required,
        is_editable: v.is_editable,
        config: v.config ? (typeof v.config === 'string' ? JSON.parse(v.config) : v.config) : {}
      }
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching organization variables:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Check if user belongs to this organization or has admin permissions
    if (user.organization_id !== id && !user.permissions.includes('organizations:manage')) {
      return NextResponse.json({ message: 'Sin permisos para modificar esta organización' }, { status: 403 });
    }

    const body = await request.json();
    const { variable_key, value } = body;

    if (!variable_key || value === undefined) {
      return NextResponse.json(
        { message: 'La clave de variable y el valor son requeridos' },
        { status: 400 }
      );
    }

    // Get the system variable
    const systemVariable = await executeQuery(
      `SELECT id, is_editable, data_type FROM system_variables WHERE [key] = @variable_key`,
      { variable_key }
    );

    if (systemVariable.length === 0) {
      return NextResponse.json({ message: 'Variable del sistema no encontrada' }, { status: 404 });
    }

    if (!systemVariable[0].is_editable) {
      return NextResponse.json({ message: 'Esta variable no es editable' }, { status: 403 });
    }

    // Check if organization variable already exists
    const existingVar = await executeQuery(
      `SELECT id FROM organization_variables 
      WHERE organization_id = @organization_id AND system_variable_id = @system_variable_id`,
      { organization_id: id, system_variable_id: systemVariable[0].id }
    );

    if (existingVar.length > 0) {
      // Update existing variable
      const result = await executeQuery(
        `UPDATE organization_variables 
        SET 
          value = @value,
          updated_by = @updated_by,
          updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id`,
        { value, updated_by: user.id, id: existingVar[0].id }
      );
      return NextResponse.json(result[0]);
    } else {
      // Create new variable
      const result = await executeQuery(
        `INSERT INTO organization_variables (
          organization_id, system_variable_id, value, created_by, updated_by
        )
        VALUES (
          @organization_id, @system_variable_id, @value, @created_by, @updated_by
        )
        OUTPUT INSERTED.*`,
        { organization_id: id, system_variable_id: systemVariable[0].id, value, created_by: user.id, updated_by: user.id }
      );
      return NextResponse.json(result[0], { status: 201 });
    }
  } catch (error) {
    console.error('Error saving organization variable:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}