import { NextRequest, NextResponse } from 'next/server';
import { getUserOrganizations, getUserPermissions, getUserRoles } from '@/utils/auth';
import { executeQuerySingle } from '@/utils/sql';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // Obtener token de las cookies
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No autenticado - token no encontrado' },
        { status: 401 }
      );
    }

    // Verificar y decodificar el token JWT
    let decoded: any;
    try {
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
      decoded = jwt.verify(token, jwtSecret);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      );
    }

    const userId = decoded.id;

    // Obtener información del usuario
    const userInfo = await executeQuerySingle<{
      id: number;
      email: string;
      name: string;
      avatar?: string;
      active: boolean;
    }>(
      'SELECT id, email, name, avatar, active FROM users WHERE id = @userId',
      { userId }
    );

    if (!userInfo || !userInfo.active) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado o inactivo' },
        { status: 401 }
      );
    }

    // Verificar si es Super Admin
    const isSuperAdmin = await executeQuerySingle<{ role_count: number }>(
      `SELECT COUNT(*) as role_count
       FROM user_role_assignments ur
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = @userId 
       AND ur.active = 1
       AND r.name = 'Super Admin'
       AND r.active = 1`,
      { userId }
    );

    const isUserSuperAdmin = isSuperAdmin?.role_count > 0;

    // Obtener organizaciones del usuario
    const organizations = await getUserOrganizations(userId);

    // Obtener organización actual de la sesión
    const sessionData = await executeQuerySingle<{
      organization_id: string;
    }>(
      'SELECT organization_id FROM user_sessions WHERE session_token = @token',
      { token }
    );

    const currentOrgId = sessionData?.organization_id;
    let currentOrganization = null;

    // Si es Super Admin y tiene una organización en la sesión, buscarla directamente
    if (isUserSuperAdmin && currentOrgId) {
      const orgData = await executeQuerySingle<any>(
        `SELECT id, name, logo, rut, active, expires_at 
         FROM organizations 
         WHERE id = @organizationId`,
        { organizationId: currentOrgId }
      );
      
      if (orgData) {
        currentOrganization = {
          id: orgData.id,
          name: orgData.name,
          logo: orgData.logo,
          rut: orgData.rut,
          active: orgData.active,
          expires_at: orgData.expires_at
        };
      }
    } else {
      // Para usuarios normales, buscar en sus organizaciones asignadas
      currentOrganization = currentOrgId 
        ? organizations.find(org => org.id === currentOrgId)
        : organizations[0]; // Fallback a la primera organización
    }

    if (!currentOrganization && !isUserSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Usuario sin organizaciones asignadas' },
        { status: 403 }
      );
    }

    // Obtener permisos y roles para la organización actual
    const [permissions, roles] = await Promise.all([
      getUserPermissions(userId, currentOrganization.id),
      getUserRoles(userId, currentOrganization.id)
    ]);

    // Debug temporal
    console.log('🔍 /me API Debug:', {
      userId,
      email: userInfo.email,
      currentOrganization: currentOrganization.name,
      currentOrgId: currentOrganization.id,
      roles,
      permissionCount: permissions.length,
      permissions,
      hasOrganizationsViewAll: permissions.includes('organizations:view_all')
    });

    const user = {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      avatar: userInfo.avatar,
      permissions,
      roles,
      organizations,
      currentOrganization
    };

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Me API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}