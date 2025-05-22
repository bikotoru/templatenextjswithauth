import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { OrganizationBackendService } from '../services/backend.service';
import { OrganizationSearchParams, OrganizationCreateRequest } from '../types';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    // Verificar si es Super Admin
    const isSuperAdmin = user.roles?.includes('Super Admin') || false;
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Solo Super Admin puede gestionar organizaciones' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const params: OrganizationSearchParams = {
      search: searchParams.get('search') || undefined,
      active: searchParams.get('active') ? searchParams.get('active') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10'),
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC',
    };

    const result = await OrganizationBackendService.getAll(params, user);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Organizations GET API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    // Verificar si es Super Admin
    const isSuperAdmin = user.roles?.includes('Super Admin') || false;
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Solo Super Admin puede crear organizaciones' }, { status: 403 });
    }

    const body = await request.json();
    const organizationData: OrganizationCreateRequest = body;

    // Validaciones básicas
    if (!organizationData.name) {
      return NextResponse.json(
        { success: false, error: 'El nombre de la organización es requerido' },
        { status: 400 }
      );
    }

    if (organizationData.name.toUpperCase() === 'SYSTEM') {
      return NextResponse.json(
        { success: false, error: 'No se puede usar el nombre "SYSTEM"' },
        { status: 400 }
      );
    }

    const result = await OrganizationBackendService.create(organizationData, user);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Organizations POST API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}