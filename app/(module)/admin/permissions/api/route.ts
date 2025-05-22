import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { executeQuery } from '@/utils/sql';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    if (!(await hasPermission(user.id, 'permissions:view'))) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const permissions = await executeQuery(`
      SELECT 
        id, 
        name as permission_key, 
        name as display_name, 
        description, 
        'general' as module, 
        1 as active, 
        created_at, 
        updated_at 
      FROM permissions 
      ORDER BY name
    `);

    return NextResponse.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Permissions GET API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}