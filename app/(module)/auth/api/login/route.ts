import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validación básica
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y password son requeridos' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    // Intentar login
    const { organizationId } = body; // Agregar organizationId del request
    const result = await login({ email, password, organizationId });
    
    // Debug temporal
    console.log('🔍 Login Result Debug:', {
      email,
      success: result.success,
      requiresOrganizationSelection: result.requiresOrganizationSelection,
      userRoles: result.user?.roles,
      userPermissions: result.user?.permissions,
      currentOrganization: result.user?.currentOrganization
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // Si requiere selección de organización, devolver sin token
    if (result.requiresOrganizationSelection) {
      return NextResponse.json({
        success: true,
        requiresOrganizationSelection: true,
        organizations: result.organizations,
        user: result.user
      });
    }

    // Login exitoso - crear response con cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
      message: 'Login exitoso'
    });

    // Establecer cookie de autenticación
    response.cookies.set('auth-token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 horas en segundos
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas desde ahora
    });

    return response;

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}