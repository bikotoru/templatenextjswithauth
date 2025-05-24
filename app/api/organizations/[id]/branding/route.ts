import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/utils/sql';
import { verifyAuthFromRequest } from '@/utils/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Check if user belongs to this organization or has admin permissions
    if (user.organization_id !== id && !user.permissions.includes('organizations:manage')) {
      return NextResponse.json({ message: 'Sin permisos para modificar esta organización' }, { status: 403 });
    }

    const body = await request.json();
    const { logo, favicon } = body;

    // Update organization branding
    const result = await executeQuery(
      `UPDATE organizations 
       SET 
         logo = @logo,
         favicon = @favicon,
         updated_by = @updated_by,
         updated_at = GETDATE()
       OUTPUT INSERTED.*
       WHERE id = @id`,
      {
        logo: logo || null,
        favicon: favicon || null,
        updated_by: user.id,
        id: id
      }
    );

    if (result.length === 0) {
      return NextResponse.json({ message: 'Organización no encontrada' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating organization branding:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}