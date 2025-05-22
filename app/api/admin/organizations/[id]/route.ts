import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest } from '@/utils/auth';
import { OrganizationBackendService } from '@/app/(module)/admin/organizations/services/backend.service';

// GET /api/admin/organizations/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Solo Super Admin puede ver organizaciones
    const isSuperAdmin = user.roles?.some(role => role === 'Super Admin') || user.permissions?.includes('system:manage');
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
    }

    const result = await OrganizationBackendService.getById(params.id, user);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Error al obtener organización',
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/organizations/[id]:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener organización',
    }, { status: 500 });
  }
}

// PUT /api/admin/organizations/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Solo Super Admin puede editar organizaciones
    const isSuperAdmin = user.roles?.some(role => role === 'Super Admin') || user.permissions?.includes('system:manage');
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    const result = await OrganizationBackendService.update(params.id, {
      ...body,
      updated_by_id: user.id,
    }, user);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Error al actualizar organización',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/organizations/[id]:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar organización',
    }, { status: 500 });
  }
}

// DELETE /api/admin/organizations/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Solo Super Admin puede eliminar organizaciones
    const isSuperAdmin = user.roles?.some(role => role === 'Super Admin') || user.permissions?.includes('system:manage');
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
    }

    const result = await OrganizationBackendService.delete(params.id, user);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Error al eliminar organización',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Organización eliminada correctamente',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/organizations/[id]:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar organización',
    }, { status: 500 });
  }
}