import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { SystemVariableBackendService } from '@/app/(module)/admin/system-variables/services/backend.service';
import { SetVariableValueRequest } from '@/app/(module)/admin/system-variables/types';

// PUT /api/admin/system-variables/[id]/value - Establecer valor de variable
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (!(await hasPermission(user.id, 'system_variables:update'))) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para actualizar variables del sistema' },
        { status: 403 }
      );
    }

    if (!user.currentOrganization) {
      return NextResponse.json(
        { success: false, error: 'No hay organización seleccionada' },
        { status: 400 }
      );
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de variable inválido' },
        { status: 400 }
      );
    }

    const body: SetVariableValueRequest = await request.json();

    const result = await SystemVariableBackendService.setValue(
      id,
      user.currentOrganization.id,
      body,
      user
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
    console.error('Error in PUT /api/admin/system-variables/[id]/value:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}