import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { SystemVariableGroupsBackendService } from '@/app/(module)/admin/system-variables/services/groups.backend.service';
import { UpdateGroupRequest } from '@/app/(module)/admin/system-variables/types';

// GET /api/admin/system-variables/groups/[id] - Obtener grupo por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de grupo inválido' },
        { status: 400 }
      );
    }

    const result = await SystemVariableGroupsBackendService.getById(id, user);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.includes('no encontrado') ? 404 : 500 }
      );
    }
  } catch (error) {
    console.error('Error in GET /api/admin/system-variables/groups/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/system-variables/groups/[id] - Actualizar grupo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de grupo inválido' },
        { status: 400 }
      );
    }

    const body: UpdateGroupRequest = await request.json();

    const result = await SystemVariableGroupsBackendService.update(id, body, user);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.includes('no encontrado') ? 404 : 400 }
      );
    }
  } catch (error) {
    console.error('Error in PUT /api/admin/system-variables/groups/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/system-variables/groups/[id] - Eliminar grupo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de grupo inválido' },
        { status: 400 }
      );
    }

    const result = await SystemVariableGroupsBackendService.delete(id, user);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Grupo eliminado correctamente'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in DELETE /api/admin/system-variables/groups/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}