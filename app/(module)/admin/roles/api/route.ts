import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { RoleBackendService } from '../services/backend.service';
import { RoleSearchParams, RoleCreateRequest } from '../types';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    if (!(await hasPermission(user.id, 'roles:view'))) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const params: RoleSearchParams = {
      search: searchParams.get('search') || undefined,
      active: searchParams.get('active') ? searchParams.get('active') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10'),
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC',
    };

    const result = await RoleBackendService.getAll(params);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Roles GET API error:', error);
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

    if (!(await hasPermission(user.id, 'roles:create'))) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json();
    const roleData: RoleCreateRequest = body;

    // Validaciones básicas
    if (!roleData.name) {
      return NextResponse.json(
        { success: false, error: 'El nombre del rol es requerido' },
        { status: 400 }
      );
    }

    const result = await RoleBackendService.create(roleData);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Roles POST API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}