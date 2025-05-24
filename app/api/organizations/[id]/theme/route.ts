import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeQuerySingle } from '@/utils/sql';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { THEME_PALETTES } from '@/lib/theme-palettes';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado' 
      }, { status: 401 });
    }

    // Verificar permiso para ver temas
    if (!(await hasPermission(user.id, 'themes:view'))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Sin permisos para ver configuración de temas' 
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await executeQuerySingle<{
      palette_key: string;
      custom_logo_url?: string;
      custom_favicon_url?: string;
    }>(
      `SELECT palette_key, custom_logo_url, custom_favicon_url
       FROM theme_settings 
       WHERE organization_id = @organizationId 
       AND active = 1 
       AND is_active = 1`,
      { organizationId: id }
    );

    const themeData = result || { palette_key: 'corporate_blue' };

    return NextResponse.json({
      success: true,
      data: themeData
    });
  } catch (error) {
    console.error('Error al obtener tema:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al obtener tema de la organización' 
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado' 
      }, { status: 401 });
    }

    // Verificar permiso para gestionar temas
    if (!(await hasPermission(user.id, 'themes:manage'))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Sin permisos para gestionar temas corporativos' 
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { palette_key } = body;

    // Validar que la paleta existe
    if (!palette_key || !THEME_PALETTES[palette_key]) {
      return NextResponse.json({ 
        success: false, 
        error: 'Paleta de colores no válida' 
      }, { status: 400 });
    }

    // Verificar que el usuario tiene acceso a la organización
    const orgAccess = await executeQuerySingle<{ count: number }>(
      `SELECT COUNT(*) as count FROM user_organizations 
       WHERE user_id = @userId 
       AND organization_id = @organizationId 
       AND active = 1`,
      { userId: user.id, organizationId: id }
    );

    if (!orgAccess || orgAccess.count === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Sin acceso a la organización' 
      }, { status: 403 });
    }

    // Desactivar configuración actual
    await executeQuery(
      `UPDATE theme_settings 
       SET is_active = 0, 
           updated_by_id = @userId, 
           updated_at = GETDATE()
       WHERE organization_id = @organizationId 
       AND active = 1 
       AND is_active = 1`,
      { userId: user.id, organizationId: id }
    );

    // Verificar si ya existe una configuración inactiva para esta paleta
    const existingTheme = await executeQuerySingle<{ id: number }>(
      `SELECT id FROM theme_settings
       WHERE organization_id = @organizationId
       AND palette_key = @paletteKey
       AND active = 1
       AND is_active = 0`,
      { organizationId: id, paletteKey: palette_key }
    );

    if (existingTheme) {
      // Reactivar configuración existente
      await executeQuery(
        `UPDATE theme_settings 
         SET is_active = 1,
             updated_by_id = @userId, 
             updated_at = GETDATE()
         WHERE id = @themeId`,
        { userId: user.id, themeId: existingTheme.id }
      );
    } else {
      // Crear nueva configuración
      await executeQuery(
        `INSERT INTO theme_settings (
           organization_id, 
           palette_key, 
           is_active, 
           created_by_id, 
           updated_by_id
         )
         VALUES (
           @organizationId, 
           @paletteKey, 
           1,
           @userId, 
           @userId
         )`,
        { 
          organizationId: id, 
          paletteKey: palette_key, 
          userId: user.id 
        }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tema corporativo actualizado correctamente',
      data: { palette_key }
    });

  } catch (error) {
    console.error('Error al actualizar tema:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al actualizar tema corporativo' 
    }, { status: 500 });
  }
}