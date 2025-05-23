import { NextRequest, NextResponse } from 'next/server';
import { PasswordResetService } from '@/utils/password-reset';
import { emailService } from '@/email/services/email.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validaciones básicas
    if (!email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'El email es requerido' 
        },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Formato de email inválido' 
        },
        { status: 400 }
      );
    }

    // Verificar que el servicio de email esté configurado
    if (!emailService.isConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'El servicio de recuperación de contraseñas no está disponible. Contacta al administrador.' 
        },
        { status: 503 }
      );
    }

    // Obtener información del request para seguridad
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const user_agent = request.headers.get('user-agent') || 'unknown';

    // Procesar solicitud de reset
    const result = await PasswordResetService.requestPasswordReset({
      email: email.toLowerCase().trim(),
      ip_address,
      user_agent
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 400 }
      );
    }

    // Log para auditoría (sin información sensible)
    console.log(`Password reset requested for email pattern: ${email.replace(/(.{2}).*(@.*)/, '$1***$2')} from IP: ${ip_address}`);

    return NextResponse.json({
      success: true,
      message: result.message,
      // En desarrollo, incluir información adicional
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          token: result.token,
          expiresAt: result.expiresAt,
          emailProvider: emailService.getProviderInfo()
        }
      })
    });

  } catch (error) {
    console.error('Error in forgot-password API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor. Inténtalo de nuevo más tarde.' 
      },
      { status: 500 }
    );
  }
}

// Endpoint para obtener información del servicio (solo en desarrollo)
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  try {
    const emailConfigured = emailService.isConfigured();
    const providerInfo = emailService.getProviderInfo();
    
    return NextResponse.json({
      success: true,
      data: {
        emailConfigured,
        providers: providerInfo,
        frontendUrl: process.env.FRONTEND_URL
      }
    });

  } catch (error) {
    console.error('Error in forgot-password GET:', error);
    return NextResponse.json(
      { success: false, error: 'Error getting service info' },
      { status: 500 }
    );
  }
}