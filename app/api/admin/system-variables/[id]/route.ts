import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { SystemVariableBackendService } from '@/app/(module)/admin/system-variables/services/backend.service';

// GET /api/admin/system-variables/[id] - Obtener variable específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json(
        { success: false, error: 'No hay organización seleccionada' },
        { status: 400 }
      );
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de variable inválido' },
        { status: 400 }
      );
    }

    const result = await SystemVariableBackendService.getById(id, user.currentOrganization.id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === 'Variable no encontrada' ? 404 : 500 }
      );
    }
  } catch (error) {
    console.error('Error in GET /api/admin/system-variables/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/system-variables/[id] - Actualizar variable
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (!(await hasPermission(user.id, 'system_variables:update'))) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para actualizar variables del sistema' },
        { status: 403 }
      );
    }

    if (!user.currentOrganization) {
      return NextResponse.json(
        { success: false, error: 'No hay organización seleccionada' },
        { status: 400 }
      );
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de variable inválido' },
        { status: 400 }
      );
    }

    await request.json();

    // TODO: Implementar método update en backend service
    // const result = await SystemVariableBackendService.update(id, body, user);

    return NextResponse.json(
      { success: false, error: 'Método no implementado aún' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error in PUT /api/admin/system-variables/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/system-variables/[id] - Eliminar variable
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (!(await hasPermission(user.id, 'system_variables:delete'))) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para eliminar variables del sistema' },
        { status: 403 }
      );
    }

    if (!user.currentOrganization) {
      return NextResponse.json(
        { success: false, error: 'No hay organización seleccionada' },
        { status: 400 }
      );
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de variable inválido' },
        { status: 400 }
      );
    }

    // TODO: Implementar método delete en backend service
    // const result = await SystemVariableBackendService.delete(id, user);

    return NextResponse.json(
      { success: false, error: 'Método no implementado aún' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/admin/system-variables/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}