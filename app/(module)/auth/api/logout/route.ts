import { NextRequest, NextResponse } from 'next/server';
import { logout } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // Obtener token de la cookie
    const token = request.cookies.get('auth-token')?.value;

    if (token) {
      // Eliminar sesión de la base de datos
      await logout(token);
    }

    // Crear response
    const response = NextResponse.json({
      success: true,
      message: 'Logout exitoso'
    });

    // Eliminar cookie de autenticación
    response.cookies.delete('auth-token');

    return response;

  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}