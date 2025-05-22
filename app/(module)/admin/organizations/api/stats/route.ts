import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest } from '@/utils/auth';
import { OrganizationBackendService } from '../../services/backend.service';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    // Verificar si es Super Admin
    const isSuperAdmin = user.roles?.includes('Super Admin') || false;
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Solo Super Admin puede ver estadísticas' }, { status: 403 });
    }

    const result = await OrganizationBackendService.getStats(user);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Organization stats API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}