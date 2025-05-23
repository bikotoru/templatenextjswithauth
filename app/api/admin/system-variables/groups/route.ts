import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { SystemVariableGroupsBackendService } from '@/app/(module)/admin/system-variables/services/groups.backend.service';
import { CreateGroupRequest, GroupSearchParams } from '@/app/(module)/admin/system-variables/types';

// GET /api/admin/system-variables/groups - Obtener todos los grupos
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (!(await hasPermission(user.id, 'system_variables:groups:manage'))) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para gestionar grupos de variables' },
        { status: 403 }
      );
    }

    // Obtener parámetros de búsqueda
    const searchParams = request.nextUrl.searchParams;
    const params: GroupSearchParams = {
      search: searchParams.get('search') || undefined,
      active: searchParams.get('active') ? searchParams.get('active') === 'true' : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') as 'ASC' | 'DESC' || undefined,
    };

    const result = await SystemVariableGroupsBackendService.getAll(params, user);

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
    console.error('Error in GET /api/admin/system-variables/groups:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/admin/system-variables/groups - Crear nuevo grupo
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (!(await hasPermission(user.id, 'system_variables:groups:manage'))) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para gestionar grupos de variables' },
        { status: 403 }
      );
    }

    const body: CreateGroupRequest = await request.json();

    // Validaciones básicas
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'El nombre del grupo es requerido' },
        { status: 400 }
      );
    }

    const result = await SystemVariableGroupsBackendService.create(body, user);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      }, { status: 201 });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/admin/system-variables/groups:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}