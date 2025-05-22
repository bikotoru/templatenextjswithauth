import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/utils/sql';
import { verifyAuthFromRequest } from '@/utils/auth';

// GET /api/admin/organizations/[id]/users - Obtener usuarios de una organización
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

    // Solo Super Admin puede ver usuarios de organizaciones
    if (!user.roles.includes('Super Admin')) {
      return NextResponse.json(
        { error: 'Solo Super Admin puede ver usuarios de organizaciones' },
        { status: 403 }
      );
    }

    const organizationId = params.id;

    // Query para obtener usuarios de la organización con información de roles
    const query = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.avatar,
        u.active,
        u.created_at,
        u.updated_at,
        uo.joined_at,
        STUFF((
          SELECT ', ' + r.name
          FROM user_role_assignments ura
          JOIN roles r ON ura.role_id = r.id
          WHERE ura.user_id = u.id AND ura.organization_id = @organizationId
          FOR XML PATH('')
        ), 1, 2, '') as roles_string
      FROM users u
      INNER JOIN user_organizations uo ON u.id = uo.user_id
      WHERE uo.organization_id = @organizationId 
        AND uo.active = 1
      ORDER BY uo.joined_at DESC
    `;

    const result = await executeQuery<any>(query, { organizationId });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Error al obtener usuarios de la organización' },
        { status: 500 }
      );
    }

    // Procesar los resultados para incluir roles como array
    const users = result.data.map(user => ({
      ...user,
      roles: user.roles_string ? user.roles_string.split(', ') : []
    }));

    return NextResponse.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error in GET /api/admin/organizations/[id]/users:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}