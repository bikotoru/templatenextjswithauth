import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { RoleBackendService } from '../../services/backend.service';
import { RoleUpdateRequest } from '../../types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    if (!(await hasPermission(user.id, 'roles:view'))) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const result = await RoleBackendService.getById(id);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Role GET API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    if (!(await hasPermission(user.id, 'roles:edit'))) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const roleData: RoleUpdateRequest = body;

    const result = await RoleBackendService.update(id, roleData);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Role PUT API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    if (!(await hasPermission(user.id, 'roles:delete'))) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const result = await RoleBackendService.delete(id);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Role DELETE API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}