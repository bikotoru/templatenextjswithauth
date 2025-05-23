import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest } from '@/utils/auth';
import { OrganizationBackendService } from '@/app/(module)/admin/organizations/services/backend.service';

// GET /api/admin/organizations
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Solo Super Admin puede ver todas las organizaciones
    const isSuperAdmin = user.roles?.some(role => role === 'Super Admin') || user.permissions?.includes('system:manage');
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Acceso denegado. Solo Super Admin puede ver todas las organizaciones.' }, { status: 403 });
    }

    // Parse search params
    const searchParams = request.nextUrl.searchParams;
    const params = {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10'),
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') || 'DESC') as 'ASC' | 'DESC',
      active: searchParams.get('active') === 'false' ? false : true,
    };

    const result = await OrganizationBackendService.getAll(params, user);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Error al obtener organizaciones',
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/organizations:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener organizaciones',
    }, { status: 500 });
  }
}

// POST /api/admin/organizations
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Solo Super Admin puede crear organizaciones
    const isSuperAdmin = user.roles?.some(role => role === 'Super Admin') || user.permissions?.includes('system:manage');
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Acceso denegado. Solo Super Admin puede crear organizaciones.' }, { status: 403 });
    }

    const body = await request.json();
    const result = await OrganizationBackendService.create({
      ...body,
      created_by_id: user.id,
      updated_by_id: user.id,
    }, user);

    if (!result.success) {
      // Determinar el status code apropiado basado en el tipo de error
      const isValidationError = result.error?.includes('ya está registrado') || 
                               result.error?.includes('Ya existe una organización') ||
                               result.error?.includes('no existe en el sistema') ||
                               result.error?.includes('está desactivado');
      
      return NextResponse.json({
        success: false,
        error: result.error || 'Error al crear organización',
      }, { status: isValidationError ? 400 : 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/organizations:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear organización',
    }, { status: 500 });
  }
}