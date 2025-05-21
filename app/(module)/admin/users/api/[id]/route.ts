import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { UserBackendService } from '../../services/backend.service';
import { UserUpdateRequest } from '../../types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    if (!(await hasPermission(user.id, 'users:view'))) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const result = await UserBackendService.getById(id);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('User GET API error:', error);
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

    if (!(await hasPermission(user.id, 'users:edit'))) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const userData: UserUpdateRequest = body;

    const result = await UserBackendService.update(id, userData);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('User PUT API error:', error);
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

    if (!(await hasPermission(user.id, 'users:delete'))) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const result = await UserBackendService.delete(id);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('User DELETE API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}