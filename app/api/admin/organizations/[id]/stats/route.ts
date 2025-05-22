import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeQuerySingle } from '@/utils/sql';
import { verifyAuthFromRequest } from '@/utils/auth';

// GET /api/admin/organizations/[id]/stats - Obtener estadísticas de una organización
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación y permisos
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo Super Admin puede ver estadísticas de organizaciones
    if (!user.roles.includes('Super Admin')) {
      return NextResponse.json(
        { error: 'Solo Super Admin puede ver estadísticas de organizaciones' },
        { status: 403 }
      );
    }

    const organizationId = params.id;

    // 1. Estadísticas de usuarios
    const userStatsQuery = `
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN u.active = 1 THEN 1 ELSE 0 END) as activeUsers,
        SUM(CASE WHEN u.active = 0 THEN 1 ELSE 0 END) as inactiveUsers,
        SUM(CASE 
          WHEN uo.joined_at >= DATEADD(month, -1, GETDATE()) THEN 1 
          ELSE 0 
        END) as usersJoinedThisMonth,
        SUM(CASE 
          WHEN uo.joined_at >= DATEADD(week, -1, GETDATE()) THEN 1 
          ELSE 0 
        END) as usersJoinedThisWeek
      FROM users u
      INNER JOIN user_organizations uo ON u.id = uo.user_id
      WHERE uo.organization_id = @organizationId AND uo.active = 1
    `;

    const userStats = await executeQuerySingle<any>(userStatsQuery, { organizationId });

    // 2. Estadísticas de roles
    const roleStatsQuery = `
      SELECT 
        COUNT(*) as totalRoles,
        AVG(CAST(roleCount as FLOAT)) as averageRolesPerUser
      FROM (
        SELECT ura.user_id, COUNT(*) as roleCount
        FROM user_role_assignments ura
        INNER JOIN user_organizations uo ON ura.user_id = uo.user_id
        WHERE ura.organization_id = @organizationId AND uo.organization_id = @organizationId AND uo.active = 1
        GROUP BY ura.user_id
      ) as userRoleCounts
    `;

    const roleStats = await executeQuerySingle<any>(roleStatsQuery, { organizationId });

    // 3. Rol más asignado
    const mostAssignedRoleQuery = `
      SELECT TOP 1 r.name
      FROM user_role_assignments ura
      INNER JOIN roles r ON ura.role_id = r.id
      INNER JOIN user_organizations uo ON ura.user_id = uo.user_id
      WHERE ura.organization_id = @organizationId AND uo.organization_id = @organizationId AND uo.active = 1
      GROUP BY r.name
      ORDER BY COUNT(*) DESC
    `;

    const mostAssignedRoleResult = await executeQuerySingle<{ name: string }>(mostAssignedRoleQuery, { organizationId });

    // 4. Estadísticas de actividad (basadas en user_sessions si existe)
    const activityStatsQuery = `
      SELECT 
        COUNT(*) as totalLogins,
        SUM(CASE 
          WHEN us.created_at >= DATEADD(month, -1, GETDATE()) THEN 1 
          ELSE 0 
        END) as loginsThisMonth,
        SUM(CASE 
          WHEN us.created_at >= DATEADD(week, -1, GETDATE()) THEN 1 
          ELSE 0 
        END) as loginsThisWeek,
        MAX(us.created_at) as lastActivityDate
      FROM user_sessions us
      INNER JOIN user_organizations uo ON us.user_id = uo.user_id
      WHERE uo.organization_id = @organizationId AND uo.active = 1
    `;

    const activityStats = await executeQuerySingle<any>(activityStatsQuery, { organizationId });

    // 5. Usuario más activo
    const mostActiveUserQuery = `
      SELECT TOP 1 u.name
      FROM user_sessions us
      INNER JOIN users u ON us.user_id = u.id
      INNER JOIN user_organizations uo ON u.id = uo.user_id
      WHERE uo.organization_id = @organizationId AND uo.active = 1
      GROUP BY u.id, u.name
      ORDER BY COUNT(*) DESC
    `;

    const mostActiveUserResult = await executeQuerySingle<{ name: string }>(mostActiveUserQuery, { organizationId });

    // 6. Información del sistema de la organización
    const systemStatsQuery = `
      SELECT 
        created_at,
        expires_at,
        CASE 
          WHEN expires_at IS NOT NULL AND expires_at < GETDATE() THEN 1 
          ELSE 0 
        END as isExpired,
        CASE 
          WHEN expires_at IS NOT NULL THEN DATEDIFF(day, GETDATE(), expires_at)
          ELSE NULL 
        END as daysUntilExpiration,
        DATEDIFF(day, created_at, GETDATE()) as organizationAge
      FROM organizations
      WHERE id = @organizationId
    `;

    const systemStats = await executeQuerySingle<any>(systemStatsQuery, { organizationId });

    // Construir respuesta
    const stats = {
      userStats: {
        totalUsers: userStats?.data?.totalUsers || 0,
        activeUsers: userStats?.data?.activeUsers || 0,
        inactiveUsers: userStats?.data?.inactiveUsers || 0,
        usersJoinedThisMonth: userStats?.data?.usersJoinedThisMonth || 0,
        usersJoinedThisWeek: userStats?.data?.usersJoinedThisWeek || 0,
      },
      roleStats: {
        totalRoles: roleStats?.data?.totalRoles || 0,
        mostAssignedRole: mostAssignedRoleResult?.data?.name || null,
        averageRolesPerUser: roleStats?.data?.averageRolesPerUser || 0,
      },
      activityStats: {
        totalLogins: activityStats?.data?.totalLogins || 0,
        loginsThisMonth: activityStats?.data?.loginsThisMonth || 0,
        loginsThisWeek: activityStats?.data?.loginsThisWeek || 0,
        lastActivityDate: activityStats?.data?.lastActivityDate || null,
        mostActiveUser: mostActiveUserResult?.data?.name || null,
      },
      systemStats: {
        organizationAge: systemStats?.data?.organizationAge || 0,
        createdAt: systemStats?.data?.created_at || null,
        isExpired: systemStats?.data?.isExpired === 1,
        expiresAt: systemStats?.data?.expires_at || null,
        daysUntilExpiration: systemStats?.data?.daysUntilExpiration || null,
      }
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error in GET /api/admin/organizations/[id]/stats:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}