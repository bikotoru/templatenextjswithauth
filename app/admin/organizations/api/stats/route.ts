import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest } from '@/utils/auth';
import { OrganizationBackendService } from '@/app/(module)/admin/organizations/services/backend.service';

// GET /admin/organizations/api/stats - Obtener estadísticas generales
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo Super Admin puede ver estadísticas de organizaciones
    if (!user.roles.includes('Super Admin')) {
      return NextResponse.json(
        { error: 'Solo Super Admin puede ver estadísticas de organizaciones' },
        { status: 403 }
      );
    }

    const result = await OrganizationBackendService.getStats();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al obtener estadísticas' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in GET /admin/organizations/api/stats:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}