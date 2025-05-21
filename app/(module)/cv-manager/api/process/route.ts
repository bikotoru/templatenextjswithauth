import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blobUrl } = body;
    
    if (!blobUrl) {
      return NextResponse.json(
        { error: 'No blobUrl provided' },
        { status: 400 }
      );
    }
    
    // Configurar la URL de la API de Python
    const apiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000/api';
    
    // Llamar a la API de procesamiento de CV
    const response = await fetch(`${apiUrl}/cv/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: blobUrl,
        metadata: {
          source: 'web-upload',
          timestamp: new Date().toISOString()
        }
      }),
    });
    
    const result = await response.json();
    
    // Añadir timestamp para cálculo de tiempo de procesamiento
    return NextResponse.json({
      ...result,
      processStartTime: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error processing CV:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to process CV',
        message: 'Error durante el procesamiento del CV'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const candidateId = searchParams.get('candidateId');
    
    if (!candidateId) {
      return NextResponse.json(
        { error: 'No candidateId provided' },
        { status: 400 }
      );
    }
    
    // Configurar la URL de la API de Python
    const apiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000/api';
    
    // Llamar a la API para verificar el estado del procesamiento
    const response = await fetch(`${apiUrl}/costs/ultima-operacion`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Error checking CV processing status:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to check processing status' },
      { status: 500 }
    );
  }
}
