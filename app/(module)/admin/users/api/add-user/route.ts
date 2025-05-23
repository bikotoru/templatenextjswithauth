import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest, hasPermission } from '@/utils/auth';
import { executeQuerySingle, executeTransaction } from '@/utils/sql';
import bcrypt from 'bcryptjs';

interface AddUserRequest {
  email: string;
  name?: string;
  roleIds?: number[];
  permissionIds?: number[];
  temporaryPassword?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    if (!(await hasPermission(user.id, 'users:create'))) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const body: AddUserRequest = await request.json();
    
    // Validaciones básicas
    if (!body.email) {
      return NextResponse.json({ 
        success: false, 
        error: 'El email es requerido' 
      }, { status: 400 });
    }

    if (!user.currentOrganization?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'No hay organización activa' 
      }, { status: 400 });
    }

    const result = await executeTransaction(async (transaction) => {
      // 1. Verificar si el usuario ya existe
      const existingUser = await executeQuerySingle<{ id: number; name: string; active: boolean }>(
        'SELECT id, name, active FROM users WHERE email = @email',
        { email: body.email }
      );

      let targetUserId: number;
      let isNewUser = false;

      if (existingUser) {
        // Usuario existe
        if (!existingUser.active) {
          throw new Error('El usuario existe pero está inactivo');
        }

        // 2. Verificar si ya está en la organización actual
        if (!user.currentOrganization) {
          throw new Error('No hay organización seleccionada');
        }
        
        const userInOrg = await executeQuerySingle<{ exists: number }>(
          `SELECT COUNT(*) as exists 
           FROM user_organizations 
           WHERE user_id = @userId AND organization_id = @orgId AND active = 1`,
          { 
            userId: existingUser.id, 
            orgId: user.currentOrganization.id 
          }
        );

        if ((userInOrg?.exists || 0) > 0) {
          throw new Error('El usuario ya pertenece a esta organización');
        }

        targetUserId = existingUser.id;
      } else {
        // 3. Crear nuevo usuario
        if (!body.name) {
          throw new Error('El nombre es requerido para usuarios nuevos');
        }

        // Generar contraseña temporal si no se proporciona
        const tempPassword = body.temporaryPassword || '123456';
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        const insertUserRequest = transaction.request();
        insertUserRequest.input('email', body.email);
        insertUserRequest.input('name', body.name);
        insertUserRequest.input('passwordHash', hashedPassword);
        insertUserRequest.input('createdById', user.id);
        insertUserRequest.input('updatedById', user.id);

        const userResult = await insertUserRequest.query(`
          INSERT INTO users (email, password_hash, name, active, created_at, updated_at, created_by_id, updated_by_id)
          OUTPUT INSERTED.id
          VALUES (@email, @passwordHash, @name, 1, GETDATE(), GETDATE(), @createdById, @updatedById)
        `);

        targetUserId = userResult.recordset[0].id;
        isNewUser = true;
      }

      // 4. Asignar usuario a la organización
      const assignOrgRequest = transaction.request();
      assignOrgRequest.input('userId', targetUserId);
      assignOrgRequest.input('organizationId', user.currentOrganization!.id);
      assignOrgRequest.input('createdById', user.id);
      assignOrgRequest.input('updatedById', user.id);

      await assignOrgRequest.query(`
        INSERT INTO user_organizations (
          user_id, organization_id, joined_at, active, 
          created_at, updated_at, created_by_id, updated_by_id
        ) 
        VALUES (
          @userId, @organizationId, GETDATE(), 1, 
          GETDATE(), GETDATE(), @createdById, @updatedById
        )
      `);

      // 5. Asignar roles si se proporcionaron
      if (body.roleIds && body.roleIds.length > 0) {
        for (const roleId of body.roleIds) {
          const assignRoleRequest = transaction.request();
          assignRoleRequest.input('userId', targetUserId);
          assignRoleRequest.input('roleId', roleId);
          assignRoleRequest.input('organizationId', user.currentOrganization!.id);
          assignRoleRequest.input('createdById', user.id);
          assignRoleRequest.input('updatedById', user.id);

          await assignRoleRequest.query(`
            INSERT INTO user_role_assignments (
              user_id, role_id, organization_id, assigned_at, active,
              created_at, updated_at, created_by_id, updated_by_id
            ) 
            VALUES (
              @userId, @roleId, @organizationId, GETDATE(), 1,
              GETDATE(), GETDATE(), @createdById, @updatedById
            )
          `);
        }
      }

      // 6. Asignar permisos directos si se proporcionaron
      if (body.permissionIds && body.permissionIds.length > 0) {
        for (const permissionId of body.permissionIds) {
          const assignPermRequest = transaction.request();
          assignPermRequest.input('userId', targetUserId);
          assignPermRequest.input('permissionId', permissionId);
          assignPermRequest.input('organizationId', user.currentOrganization!.id);
          assignPermRequest.input('createdById', user.id);
          assignPermRequest.input('updatedById', user.id);

          await assignPermRequest.query(`
            INSERT INTO user_permission_assignments (
              user_id, permission_id, organization_id, assigned_at, active,
              created_at, updated_at, created_by_id, updated_by_id
            ) 
            VALUES (
              @userId, @permissionId, @organizationId, GETDATE(), 1,
              GETDATE(), GETDATE(), @createdById, @updatedById
            )
          `);
        }
      }

      // 7. Registrar actividad
      const logActivityRequest = transaction.request();
      logActivityRequest.input('userId', user.id);
      logActivityRequest.input('organizationId', user.currentOrganization!.id);
      logActivityRequest.input('action', isNewUser ? 'CREATE_USER' : 'ASSIGN_USER');
      logActivityRequest.input('resourceType', 'USER');
      logActivityRequest.input('resourceId', targetUserId.toString());
      logActivityRequest.input('details', JSON.stringify({
        email: body.email,
        name: body.name,
        isNewUser,
        roleIds: body.roleIds || [],
        permissionIds: body.permissionIds || []
      }));
      logActivityRequest.input('createdById', user.id);
      logActivityRequest.input('updatedById', user.id);

      await logActivityRequest.query(`
        INSERT INTO activity_logs (
          user_id, organization_id, action, resource_type, resource_id, details,
          created_at, updated_at, created_by_id, updated_by_id
        ) 
        VALUES (
          @userId, @organizationId, @action, @resourceType, @resourceId, @details,
          GETDATE(), GETDATE(), @createdById, @updatedById
        )
      `);

      return {
        userId: targetUserId,
        isNewUser,
        email: body.email,
        temporaryPassword: isNewUser ? (body.temporaryPassword || '123456') : null
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: result.isNewUser 
        ? 'Usuario creado y asignado exitosamente' 
        : 'Usuario asignado a la organización exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Add user API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}