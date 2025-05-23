import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { SystemVariableBackendService } from '@/app/(module)/admin/system-variables/services/backend.service';

// GET /api/admin/system-variables/key/[key] - Obtener variable por clave
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
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
        { success: false, error: 'Sin permisos para ver variables del sistema' },
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
    const key = decodeURIComponent(resolvedParams.key);

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Clave de variable requerida' },
        { status: 400 }
      );
    }

    const result = await SystemVariableBackendService.getByKey(key, user.currentOrganization.id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === 'Variable no encontrada' ? 404 : 500 }
      );
    }
  } catch (error) {
    console.error('Error in GET /api/admin/system-variables/key/[key]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}