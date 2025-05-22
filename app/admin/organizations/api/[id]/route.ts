import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest } from '@/utils/auth';
import { OrganizationBackendService } from '@/app/(module)/admin/organizations/services/backend.service';
import { OrganizationUpdateRequest } from '@/app/(module)/admin/organizations/types';

// GET /admin/organizations/api/[id] - Obtener organización por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación y permisos
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo Super Admin puede ver organizaciones
    if (!user.roles.includes('Super Admin')) {
      return NextResponse.json(
        { error: 'Solo Super Admin puede ver organizaciones' },
        { status: 403 }
      );
    }

    const organizationId = params.id;
    const result = await OrganizationBackendService.getById(organizationId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al obtener organización' },
        { status: result.error === 'Organización no encontrada' ? 404 : 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in GET /admin/organizations/api/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /admin/organizations/api/[id] - Actualizar organización
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación y permisos
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo Super Admin puede actualizar organizaciones
    if (!user.roles.includes('Super Admin')) {
      return NextResponse.json(
        { error: 'Solo Super Admin puede actualizar organizaciones' },
        { status: 403 }
      );
    }

    const organizationId = params.id;
    const body: OrganizationUpdateRequest = await request.json();
    
    // Validaciones básicas
    if (body.name !== undefined && (!body.name || body.name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'El nombre de la organización no puede estar vacío' },
        { status: 400 }
      );
    }

    const result = await OrganizationBackendService.update(organizationId, body, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al actualizar organización' },
        { status: result.error === 'Organización no encontrada' ? 404 : 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in PUT /admin/organizations/api/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /admin/organizations/api/[id] - Eliminar organización
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación y permisos
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo Super Admin puede eliminar organizaciones
    if (!user.roles.includes('Super Admin')) {
      return NextResponse.json(
        { error: 'Solo Super Admin puede eliminar organizaciones' },
        { status: 403 }
      );
    }

    const organizationId = params.id;
    const result = await OrganizationBackendService.delete(organizationId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al eliminar organización' },
        { status: result.error === 'Organización no encontrada' ? 404 : 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in DELETE /admin/organizations/api/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}