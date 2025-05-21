import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

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