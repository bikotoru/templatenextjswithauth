import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest } from '@/utils/auth';
import { OrganizationBackendService } from '../../services/backend.service';
import { OrganizationUpdateRequest } from '../../types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const result = await OrganizationBackendService.getById(params.id, user);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Organization GET API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    // Verificar si es Super Admin
    const isSuperAdmin = user.roles?.includes('Super Admin') || false;
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Solo Super Admin puede actualizar organizaciones' }, { status: 403 });
    }

    const body = await request.json();
    const organizationData: OrganizationUpdateRequest = body;

    // Validación del nombre SYSTEM
    if (organizationData.name && organizationData.name.toUpperCase() === 'SYSTEM') {
      return NextResponse.json(
        { success: false, error: 'No se puede usar el nombre "SYSTEM"' },
        { status: 400 }
      );
    }

    const result = await OrganizationBackendService.update(params.id, organizationData, user);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Organization PUT API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    // Verificar si es Super Admin
    const isSuperAdmin = user.roles?.includes('Super Admin') || false;
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Solo Super Admin puede eliminar organizaciones' }, { status: 403 });
    }

    const result = await OrganizationBackendService.delete(params.id, user);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Organization DELETE API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}