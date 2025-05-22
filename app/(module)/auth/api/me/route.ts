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
    const currentOrganization = currentOrgId 
      ? organizations.find(org => org.id === currentOrgId)
      : organizations[0]; // Fallback a la primera organización

    if (!currentOrganization) {
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