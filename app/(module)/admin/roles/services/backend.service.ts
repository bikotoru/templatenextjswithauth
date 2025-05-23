import { 
  executeQuery, 
  executeQuerySingle, 
  executeTransaction, 
  buildWhereClause, 
  buildPaginationClause, 
  buildOrderByClause,
  QueryResult,
  handleQueryError,
  handleQuerySuccess
} from '@/utils/sql';
import { UserSession } from '@/utils/auth';
import { RoleType, RoleCreateRequest, RoleUpdateRequest, RoleSearchParams, RoleListResponse } from '../types';

export class RoleBackendService {
  static async getAll(params: RoleSearchParams = {}, user?: UserSession): Promise<QueryResult<RoleListResponse>> {
    try {
      const {
        search = '',
        active,
        page = 1,
        pageSize = 10,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = params;

      // Construir condiciones WHERE
      const conditions: Record<string, unknown> = {};
      if (active !== undefined) conditions['r.active'] = active;
      
      // Filter system_hidden roles unless user is Super Admin
      const isSuperAdmin = user?.roles?.includes('Super Admin') || false;
      if (!isSuperAdmin) {
        conditions['r.system_hidden'] = false;
      }

      const { whereClause, params: whereParams } = buildWhereClause(conditions, 'AND');
      
      // Construir filtros adicionales
      let additionalWhere = '';
      const additionalParams: Record<string, unknown> = {};
      
      if (search) {
        additionalWhere += (whereClause ? ' AND ' : 'WHERE ') + '(r.name LIKE @search OR r.description LIKE @search)';
        additionalParams.search = `%${search}%`;
      }

      const finalWhere = whereClause + additionalWhere;
      const allParams = { ...whereParams, ...additionalParams };

      // Query para contar total de registros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM roles r
        ${finalWhere}
      `;

      const countResult = await executeQuerySingle<{ total: number }>(countQuery, allParams);
      const total = countResult?.total || 0;

      // Query principal con paginación
      const orderBy = buildOrderByClause(sortBy, sortOrder);
      const pagination = buildPaginationClause(page, pageSize);

      const query = `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.created_at,
          r.updated_at,
          COUNT(ur.user_id) as userCount
        FROM roles r
        LEFT JOIN user_role_assignments ur ON r.id = ur.role_id
        ${finalWhere}
        GROUP BY r.id, r.name, r.description, r.created_at, r.updated_at
        ${orderBy}
        ${pagination}
      `;

      const roles = await executeQuery<RoleType & { userCount: number }>(query, allParams);

      // Obtener permisos para cada rol
      const rolesWithPermissions: RoleType[] = await Promise.all(
        roles.map(async (role) => {
          const permissions = await executeQuery<{ name: string }>(
            `SELECT p.name
             FROM permissions p
             INNER JOIN role_permission_assignments rp ON p.id = rp.permission_id
             WHERE rp.role_id = @roleId AND rp.active = 1
             ORDER BY p.name`,
            { roleId: role.id }
          );

          return {
            ...role,
            active: true, // Campo no disponible en multi-tenant schema  
            permissions: permissions.map(p => p.name),
            userCount: role.userCount
          };
        })
      );

      const result: RoleListResponse = {
        roles: rolesWithPermissions,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };

      return handleQuerySuccess(result);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async getById(id: number): Promise<QueryResult<RoleType>> {
    try {
      const query = `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.active,
          r.created_at,
          r.updated_at,
          COUNT(ur.user_id) as userCount
        FROM roles r
        LEFT JOIN user_role_assignments ur ON r.id = ur.role_id
        WHERE r.id = @id
        GROUP BY r.id, r.name, r.description, r.active, r.created_at, r.updated_at
      `;

      const role = await executeQuerySingle<RoleType & { userCount: number }>(query, { id });

      if (!role) {
        return { success: false, error: 'Rol no encontrado' };
      }

      // Obtener permisos del rol con IDs
      const permissions = await executeQuery<{ id: number; name: string }>(
        `SELECT p.id, p.name
         FROM permissions p
         INNER JOIN role_permission_assignments rp ON p.id = rp.permission_id
         WHERE rp.role_id = @roleId AND rp.active = 1 AND p.active = 1
         ORDER BY p.name`,
        { roleId: id }
      );

      // Obtener usuarios del rol
      const users = await executeQuery<{ id: number; name: string; email: string; active: boolean }>(
        `SELECT u.id, u.name, u.email, u.active
         FROM users u
         INNER JOIN user_role_assignments ur ON u.id = ur.user_id
         WHERE ur.role_id = @roleId AND ur.active = 1 AND u.active = 1
         ORDER BY u.name`,
        { roleId: id }
      );

      const roleWithDetails: RoleType = {
        ...role,
        permissions: permissions.map(p => p.name),
        permission_ids: permissions.map(p => p.id),
        user_details: users
      };

      return handleQuerySuccess(roleWithDetails);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async create(data: RoleCreateRequest): Promise<QueryResult<RoleType>> {
    try {
      return await executeTransaction(async (transaction) => {
        // Insertar rol
        const insertQuery = `
          INSERT INTO roles (name, description, active)
          OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.active, INSERTED.created_at, INSERTED.updated_at
          VALUES (@name, @description, @active)
        `;

        const request = transaction.request();
        request.input('name', data.name);
        request.input('description', data.description || null);
        request.input('active', data.active !== false);

        const result = await request.query(insertQuery);
        const newRole = result.recordset[0];

        // Asignar permisos si se proporcionaron
        if (data.permissionIds && data.permissionIds.length > 0) {
          for (const permissionId of data.permissionIds) {
            const permRequest = transaction.request();
            permRequest.input('roleId', newRole.id);
            permRequest.input('permissionId', permissionId);
            permRequest.input('organizationId', 'SELECT organization_id FROM users WHERE id = @currentUserId');
            permRequest.input('currentUserId', 1); // This should come from authentication context
            
            await permRequest.query(`
              INSERT INTO role_permission_assignments (
                role_id, 
                permission_id, 
                organization_id, 
                assigned_at, 
                active, 
                created_at, 
                updated_at, 
                created_by_id
              ) 
              VALUES (
                @roleId, 
                @permissionId, 
                (SELECT organization_id FROM users WHERE id = @currentUserId), 
                GETDATE(), 
                1, 
                GETDATE(), 
                GETDATE(), 
                @currentUserId
              )
            `);
          }
        }

        return {
          ...newRole,
          permissions: [],
          userCount: 0
        };
      });
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async update(id: number, data: RoleUpdateRequest): Promise<QueryResult<RoleType>> {
    try {
      return await executeTransaction(async (transaction) => {
        const updates: string[] = [];
        const params: Record<string, unknown> = { id };

        if (data.name !== undefined) {
          updates.push('name = @name');
          params.name = data.name;
        }
        if (data.description !== undefined) {
          updates.push('description = @description');
          params.description = data.description;
        }
        if (data.active !== undefined) {
          updates.push('active = @active');
          params.active = data.active;
        }

        // Update role basic info if there are updates
        if (updates.length > 0) {
          updates.push('updated_at = GETDATE()');

          const query = `
            UPDATE roles 
            SET ${updates.join(', ')}
            WHERE id = @id AND active = 1
          `;

          const request = transaction.request();
          Object.entries(params).forEach(([key, value]) => {
            request.input(key, value);
          });

          await request.query(query);
        }

        // Update permissions if provided
        if (data.permissionIds !== undefined) {
          // Soft delete existing permissions
          const deletePermissionsRequest = transaction.request();
          deletePermissionsRequest.input('roleId', id);
          deletePermissionsRequest.input('currentUserId', 1); // This should come from authentication context
          await deletePermissionsRequest.query(`
            UPDATE role_permission_assignments 
            SET active = 0, updated_at = GETDATE(), updated_by_id = @currentUserId 
            WHERE role_id = @roleId AND active = 1
          `);

          // Insert new permissions
          for (const permissionId of data.permissionIds) {
            const insertPermissionRequest = transaction.request();
            insertPermissionRequest.input('roleId', id);
            insertPermissionRequest.input('permissionId', permissionId);
            insertPermissionRequest.input('currentUserId', 1); // This should come from authentication context
            
            await insertPermissionRequest.query(`
              INSERT INTO role_permission_assignments (
                role_id, 
                permission_id, 
                organization_id, 
                assigned_at, 
                active, 
                created_at, 
                updated_at, 
                created_by_id
              ) 
              VALUES (
                @roleId, 
                @permissionId, 
                (SELECT organization_id FROM users WHERE id = @currentUserId), 
                GETDATE(), 
                1, 
                GETDATE(), 
                GETDATE(), 
                @currentUserId
              )
            `);
          }
        }

        // Update users if provided
        if (data.userIds !== undefined) {
          // Soft delete existing user assignments
          const deleteUsersRequest = transaction.request();
          deleteUsersRequest.input('roleId', id);
          deleteUsersRequest.input('currentUserId', 1); // This should come from authentication context
          await deleteUsersRequest.query(`
            UPDATE user_role_assignments 
            SET active = 0, updated_at = GETDATE(), updated_by_id = @currentUserId 
            WHERE role_id = @roleId AND active = 1
          `);

          // Insert new user assignments
          for (const userId of data.userIds) {
            const insertUserRequest = transaction.request();
            insertUserRequest.input('roleId', id);
            insertUserRequest.input('userId', userId);
            insertUserRequest.input('currentUserId', 1); // This should come from authentication context
            
            await insertUserRequest.query(`
              INSERT INTO user_role_assignments (
                user_id, 
                role_id, 
                organization_id, 
                assigned_at, 
                active, 
                created_at, 
                updated_at, 
                created_by_id
              ) 
              VALUES (
                @userId, 
                @roleId, 
                (SELECT organization_id FROM users WHERE id = @currentUserId), 
                GETDATE(), 
                1, 
                GETDATE(), 
                GETDATE(), 
                @currentUserId
              )
            `);
          }
        }

        // Get updated role with full details
        const roleResult = await this.getById(id);
        return roleResult;
      });
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async delete(id: number): Promise<QueryResult<boolean>> {
    try {
      // Verificar si el rol tiene usuarios asignados
      const userCount = await executeQuerySingle<{ count: number }>(
        'SELECT COUNT(*) as count FROM user_role_assignments WHERE role_id = @id AND active = 1',
        { id }
      );

      if (userCount && userCount.count > 0) {
        return { success: false, error: 'No se puede eliminar un rol que tiene usuarios asignados' };
      }

      const query = `
        UPDATE roles 
        SET active = 0, updated_at = GETDATE()
        WHERE id = @id AND active = 1
      `;

      await executeQuery(query, { id });
      return handleQuerySuccess(true);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async assignPermissions(roleId: number, permissionIds: number[]): Promise<QueryResult<boolean>> {
    try {
      const result = await executeTransaction(async (transaction) => {
        // Soft delete existing permissions
        const deleteRequest = transaction.request();
        deleteRequest.input('roleId', roleId);
        deleteRequest.input('currentUserId', 1); // This should come from authentication context
        await deleteRequest.query(`
          UPDATE role_permission_assignments 
          SET active = 0, updated_at = GETDATE(), updated_by_id = @currentUserId 
          WHERE role_id = @roleId AND active = 1
        `);

        // Insert new permissions
        for (const permissionId of permissionIds) {
          const insertRequest = transaction.request();
          insertRequest.input('roleId', roleId);
          insertRequest.input('permissionId', permissionId);
          insertRequest.input('currentUserId', 1); // This should come from authentication context
          
          await insertRequest.query(`
            INSERT INTO role_permission_assignments (
              role_id, 
              permission_id, 
              organization_id, 
              assigned_at, 
              active, 
              created_at, 
              updated_at, 
              created_by_id
            ) 
            VALUES (
              @roleId, 
              @permissionId, 
              (SELECT organization_id FROM users WHERE id = @currentUserId), 
              GETDATE(), 
              1, 
              GETDATE(), 
              GETDATE(), 
              @currentUserId
            )
          `);
        }

        return true;
      });
      
      return handleQuerySuccess(result);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async getPermissions(user?: UserSession): Promise<QueryResult<{ id: number; name: string; description: string; category: string }[]>> {
    try {
      const isSuperAdmin = user?.roles?.includes('Super Admin') || false;
      const systemHiddenFilter = isSuperAdmin ? '' : 'AND system_hidden = 0';
      
      const query = `SELECT id, name, description, category FROM permissions WHERE active = 1 ${systemHiddenFilter} ORDER BY category, name`;
      const permissions = await executeQuery(query);
      return handleQuerySuccess(permissions);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async getRolePermissions(roleId: number): Promise<QueryResult<number[]>> {
    try {
      const query = `
        SELECT permission_id 
        FROM role_permission_assignments 
        WHERE role_id = @roleId AND active = 1
      `;
      const permissions = await executeQuery<{ permission_id: number }>(query, { roleId });
      return handleQuerySuccess(permissions.map(p => p.permission_id));
    } catch (error) {
      return handleQueryError(error);
    }
  }
}