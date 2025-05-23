import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { SystemVariableGroupsBackendService } from '@/app/(module)/admin/system-variables/services/groups.backend.service';

// GET /api/admin/system-variables/groups/options - Obtener opciones de grupos para dropdowns
export async function GET(request: NextRequest) {
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

    const result = await SystemVariableGroupsBackendService.getGroupOptions();

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in GET /api/admin/system-variables/groups/options:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}