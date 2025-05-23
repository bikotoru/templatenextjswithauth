import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { SystemVariableBackendService } from '@/app/(module)/admin/system-variables/services/backend.service';
import { CreateVariableRequest, VariableSearchParams, VariableCategory, VariableType } from '@/app/(module)/admin/system-variables/types';

// GET /api/admin/system-variables - Obtener todas las variables
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

    if (!user.currentOrganization) {
      console.error('No currentOrganization in user object:', {
        userId: user.id,
        userKeys: Object.keys(user),
        currentOrganization: user.currentOrganization
      });
      return NextResponse.json(
        { success: false, error: 'No hay organización seleccionada' },
        { status: 400 }
      );
    }

    // Obtener parámetros de búsqueda
    const searchParams = request.nextUrl.searchParams;
    const params: VariableSearchParams = {
      search: searchParams.get('search') || undefined,
      category: (searchParams.get('category') as VariableCategory) || undefined,
      variable_type: (searchParams.get('variable_type') as VariableType) || undefined,
      is_active: searchParams.get('is_active') ? searchParams.get('is_active') === 'true' : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') as 'ASC' | 'DESC' || undefined,
    };

    const result = await SystemVariableBackendService.getAll(
      user.currentOrganization.id,
      params,
      user
    );

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
    console.error('Error in GET /api/admin/system-variables:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/admin/system-variables - Crear nueva variable
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (!(await hasPermission(user.id, 'system_variables:create'))) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para crear variables del sistema' },
        { status: 403 }
      );
    }

    if (!user.currentOrganization) {
      console.error('No currentOrganization in user object:', {
        userId: user.id,
        userKeys: Object.keys(user),
        currentOrganization: user.currentOrganization
      });
      return NextResponse.json(
        { success: false, error: 'No hay organización seleccionada' },
        { status: 400 }
      );
    }

    const body: CreateVariableRequest = await request.json();

    // Validaciones básicas
    if (!body.variable_key || !body.display_name || !body.variable_type) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const result = await SystemVariableBackendService.create(body, user);

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
    console.error('Error in POST /api/admin/system-variables:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}