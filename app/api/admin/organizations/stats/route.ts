import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest } from '@/utils/auth';
import { OrganizationBackendService } from '@/app/(module)/admin/organizations/services/backend.service';

// GET /api/admin/organizations/stats
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Solo Super Admin puede ver estadísticas de organizaciones
    const isSuperAdmin = user.roles?.some(role => role === 'Super Admin') || user.permissions?.includes('system:manage');
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
    }

    const result = await OrganizationBackendService.getStats(user);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Error al obtener estadísticas',
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/organizations/stats:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener estadísticas',
    }, { status: 500 });
  }
}