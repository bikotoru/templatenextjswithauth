import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { SystemVariableBackendService } from '@/app/(module)/admin/system-variables/services/backend.service';

interface ValidateValueRequest {
  variable_key: string;
  value: unknown;
}

// POST /api/admin/system-variables/validate - Validar valor de variable
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (!(await hasPermission(user.id, 'system_variables:view'))) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para validar variables del sistema' },
        { status: 403 }
      );
    }

    if (!user.currentOrganization) {
      return NextResponse.json(
        { success: false, error: 'No hay organización seleccionada' },
        { status: 400 }
      );
    }

    const body: ValidateValueRequest = await request.json();

    if (!body.variable_key) {
      return NextResponse.json(
        { success: false, error: 'La clave de variable es requerida' },
        { status: 400 }
      );
    }

    const result = await SystemVariableBackendService.validateValue(
      user.currentOrganization.id,
      body.variable_key,
      body.value
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/admin/system-variables/validate:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}