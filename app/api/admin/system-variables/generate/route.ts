import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { SystemVariableBackendService } from '@/app/(module)/admin/system-variables/services/backend.service';

interface GenerateNumberRequest {
  variable_key: string;
  context_info?: string;
}

// POST /api/admin/system-variables/generate - Generar próximo número incremental
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (!(await hasPermission(user.id, 'system_variables:generate'))) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para generar números' },
        { status: 403 }
      );
    }

    if (!user.currentOrganization) {
      return NextResponse.json(
        { success: false, error: 'No hay organización seleccionada' },
        { status: 400 }
      );
    }

    const body: GenerateNumberRequest = await request.json();

    if (!body.variable_key) {
      return NextResponse.json(
        { success: false, error: 'La clave de variable es requerida' },
        { status: 400 }
      );
    }

    const result = await SystemVariableBackendService.generateNextNumber(
      user.currentOrganization.id,
      body.variable_key,
      user.id,
      { context_info: body.context_info }
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
    console.error('Error in POST /api/admin/system-variables/generate:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}