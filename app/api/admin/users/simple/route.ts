import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { executeQuery } from '@/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    if (!(await hasPermission(user.id, 'users:view'))) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const users = await executeQuery(`
      SELECT 
        id, 
        name, 
        email,
        active
      FROM users 
      WHERE active = 1 
      ORDER BY name
    `);

    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Users simple GET API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}