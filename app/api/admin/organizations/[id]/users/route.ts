import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/utils/sql';
import { verifyAuthFromRequest } from '@/utils/auth';

// GET /api/admin/organizations/[id]/users - Obtener usuarios de una organización
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const resolvedParams = await params;
    const organizationId = resolvedParams.id;

    // Query simplificado primero para obtener usuarios
    const usersQuery = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.avatar,
        u.active,
        u.created_at,
        u.updated_at,
        uo.joined_at
      FROM users u
      INNER JOIN user_organizations uo ON u.id = uo.user_id
      WHERE uo.organization_id = @organizationId 
        AND uo.active = 1
      ORDER BY uo.joined_at DESC
    `;

    const users = await executeQuery<Record<string, unknown>>(usersQuery, { organizationId });

    // Obtener roles para cada usuario por separado
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const rolesQuery = `
          SELECT r.name
          FROM user_role_assignments ura
          JOIN roles r ON ura.role_id = r.id
          WHERE ura.user_id = @userId 
            AND ura.organization_id = @organizationId
        `;
        
        const roles = await executeQuery<{ name: string }>(rolesQuery, { 
          userId: user.id, 
          organizationId 
        });
        
        return {
          ...user,
          roles: roles.map(r => r.name)
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: usersWithRoles
    });

  } catch (error) {
    console.error('Error in GET /api/admin/organizations/[id]/users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}