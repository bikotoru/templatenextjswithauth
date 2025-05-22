import { NextResponse } from 'next/server';
import { executeQuery } from '@/utils/sql';

export async function GET() {
  try {
    // Check organization count
    const orgCountResult = await executeQuery<{ org_count: number }>(
      'SELECT COUNT(*) as org_count FROM organizations WHERE active = 1'
    );
    const orgCount = orgCountResult[0]?.org_count || 0;

    // Check super admin user
    const superAdminResult = await executeQuery<{
      id: number;
      email: string;
      role_name: string | null;
    }>(
      `SELECT u.id, u.email, r.name as role_name 
       FROM users u 
       LEFT JOIN user_role_assignments ur ON u.id = ur.user_id 
       LEFT JOIN roles r ON ur.role_id = r.id 
       WHERE u.email = 'superadmin@system.local'`
    );

    return NextResponse.json({
      success: true,
      data: {
        organizations: {
          count: orgCount
        },
        superAdmin: superAdminResult[0] || null
      }
    });
  } catch (error) {
    console.error('Debug test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}