import { NextRequest, NextResponse } from 'next/server';
import { PasswordResetService } from '@/utils/password-reset';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    // Validación básica
    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token es requerido' 
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

    // Validar token
    const result = await PasswordResetService.validateResetToken(token);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error in validate-reset-token API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error validando el token' 
      },
      { status: 500 }
    );
  }
}

// También permitir GET para validar tokens en URLs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token es requerido' 
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

    // Validar token
    const result = await PasswordResetService.validateResetToken(token);

    return NextResponse.json({
      success: result.success,
      message: result.success ? result.message : result.error
    });

  } catch (error) {
    console.error('Error in validate-reset-token GET:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error validando el token' 
      },
      { status: 500 }
    );
  }
}