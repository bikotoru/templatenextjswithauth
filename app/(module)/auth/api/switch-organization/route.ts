import { NextRequest, NextResponse } from 'next/server';
import { getUserOrganizations, getUserPermissions, getUserRoles } from '@/utils/auth';
import { executeQuery } from '@/utils/sql';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID es requerido' },
        { status: 400 }
      );
    }

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

    // Verificar que el usuario tenga acceso a esa organización
    const userOrganizations = await getUserOrganizations(userId);
    let targetOrg = userOrganizations.find(org => org.id === organizationId);

    // Si no tiene acceso directo, verificar si es Super Admin
    if (!targetOrg) {
      // Verificar si es Super Admin
      const roles = await getUserRoles(userId, decoded.organizationId);
      const isSuperAdmin = roles.includes('Super Admin');
      
      if (isSuperAdmin) {
        // El Super Admin puede acceder a cualquier organización
        const orgQuery = await executeQuery<any>(
          `SELECT id, name, logo, rut, active, expires_at 
           FROM organizations 
           WHERE id = @organizationId`,
          { organizationId }
        );
        
        if (orgQuery.length > 0) {
          targetOrg = orgQuery[0];
        }
      }
      
      if (!targetOrg) {
        return NextResponse.json(
          { success: false, error: 'No tienes acceso a esta organización' },
          { status: 403 }
        );
      }
    }

    // Obtener permisos y roles para la nueva organización
    const [permissions, roles] = await Promise.all([
      getUserPermissions(userId, organizationId),
      getUserRoles(userId, organizationId)
    ]);

    // Actualizar la sesión activa en la base de datos
    await executeQuery(
      `UPDATE user_sessions 
       SET organization_id = @organizationId, last_activity = GETDATE() 
       WHERE session_token = @token`,
      { organizationId, token }
    );

    // Preparar el usuario actualizado
    const updatedUser = {
      id: userId,
      email: decoded.email,
      name: decoded.name,
      avatar: undefined, // Se puede obtener de la BD si es necesario
      permissions,
      roles,
      currentOrganization: targetOrg,
      organizations: userOrganizations
    };

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Cambiado a ${targetOrg.name}`
    });

  } catch (error) {
    console.error('Switch organization API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}