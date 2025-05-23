import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest } from '@/utils/auth';
import { OrganizationBackendService } from '@/app/(module)/admin/organizations/services/backend.service';
import { OrganizationCreateRequest } from '@/app/(module)/admin/organizations/types';

// GET /admin/organizations/api - Obtener todas las organizaciones
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

    // Solo Super Admin puede ver todas las organizaciones
    if (!user.roles.includes('Super Admin')) {
      return NextResponse.json(
        { error: 'Solo Super Admin puede gestionar organizaciones' },
        { status: 403 }
      );
    }

    // Extraer parámetros de búsqueda
    const searchParams = request.nextUrl.searchParams;
    const params = {
      search: searchParams.get('search') || '',
      active: searchParams.get('active') ? searchParams.get('active') === 'true' : undefined,
      expired: searchParams.get('expired') ? searchParams.get('expired') === 'true' : undefined,
      expiringThisMonth: searchParams.get('expiringThisMonth') ? searchParams.get('expiringThisMonth') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10'),
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') || 'DESC') as 'ASC' | 'DESC'
    };

    const result = await OrganizationBackendService.getAll(params);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al obtener organizaciones' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in GET /admin/organizations/api:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /admin/organizations/api - Crear nueva organización
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo Super Admin puede crear organizaciones
    if (!user.roles.includes('Super Admin')) {
      return NextResponse.json(
        { error: 'Solo Super Admin puede crear organizaciones' },
        { status: 403 }
      );
    }

    const body: OrganizationCreateRequest = await request.json();
    
    // Validaciones básicas
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'El nombre de la organización es requerido' },
        { status: 400 }
      );
    }

    const result = await OrganizationBackendService.create(body, user);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al crear organización' },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error in POST /admin/organizations/api:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}