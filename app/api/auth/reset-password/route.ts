import { NextRequest, NextResponse } from 'next/server';
import { PasswordResetService } from '@/utils/password-reset';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword, confirmPassword } = body;

    // Validaciones básicas
    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token es requerido' 
        },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'La nueva contraseña es requerida' 
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'La contraseña debe tener al menos 6 caracteres' 
        },
        { status: 400 }
      );
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Las contraseñas no coinciden' 
        },
        { status: 400 }
      );
    }

    // Validar formato del token
    if (token.length !== 64 || !/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token inválido' 
        },
        { status: 400 }
      );
    }

    // Obtener información del request para auditoría
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const user_agent = request.headers.get('user-agent') || 'unknown';

    // Procesar reset de contraseña
    const result = await PasswordResetService.confirmPasswordReset({
      token,
      newPassword,
      ip_address,
      user_agent
    });

    if (!result.success) {
      // Log para auditoría de fallos
      console.warn(`Failed password reset attempt from IP: ${ip_address}, Error: ${result.error}`);
      
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 400 }
      );
    }

    // Log para auditoría de éxito (sin información sensible)
    console.log(`Password reset completed successfully from IP: ${ip_address}`);

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error in reset-password API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor. Inténtalo de nuevo más tarde.' 
      },
      { status: 500 }
    );
  }
}