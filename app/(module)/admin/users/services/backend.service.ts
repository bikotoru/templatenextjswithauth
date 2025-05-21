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
import { hashPassword } from '@/utils/auth';
import { UserType, UserCreateRequest, UserUpdateRequest, UserSearchParams, UserListResponse } from '../types';

export class UserBackendService {
  static async getAll(params: UserSearchParams = {}): Promise<QueryResult<UserListResponse>> {
    try {
      const {
        search = '',
        role = '',
        active,
        page = 1,
        pageSize = 10,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = params;

      // Construir condiciones WHERE
      const conditions: Record<string, any> = {};
      if (active !== undefined) conditions['u.active'] = active;

      const { whereClause, params: whereParams } = buildWhereClause(conditions, 'AND');
      
      // Construir filtros adicionales
      let additionalWhere = '';
      let additionalParams: Record<string, any> = {};
      
      if (search) {
        additionalWhere += (whereClause ? ' AND ' : 'WHERE ') + '(u.name LIKE @search OR u.email LIKE @search)';
        additionalParams.search = `%${search}%`;
      }
      
      if (role) {
        additionalWhere += (whereClause || additionalWhere ? ' AND ' : 'WHERE ') + 
          'EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = u.id AND r.name = @role)';
        additionalParams.role = role;
      }

      const finalWhere = whereClause + additionalWhere;
      const allParams = { ...whereParams, ...additionalParams };

      // Query para contar total de registros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        ${finalWhere}
      `;

      const countResult = await executeQuerySingle<{ total: number }>(countQuery, allParams);
      const total = countResult?.total || 0;

      // Query principal con paginación
      const orderBy = buildOrderByClause(sortBy, sortOrder);
      const pagination = buildPaginationClause(page, pageSize);

      const query = `
        SELECT 
          u.id,
          u.email,
          u.name,
          u.avatar,
          u.active,
          u.last_login,
          u.created_at,
          u.updated_at,
          STRING_AGG(r.name, ', ') as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id AND r.active = 1
        ${finalWhere}
        GROUP BY u.id, u.email, u.name, u.avatar, u.active, u.last_login, u.created_at, u.updated_at
        ${orderBy}
        ${pagination}
      `;

      const users = await executeQuery<UserType & { roles: string }>(query, allParams);

      // Formatear datos
      const formattedUsers: UserType[] = users.map(user => ({
        ...user,
        roles: user.roles ? user.roles.split(', ') : [],
        permissions: [] // Se cargarán por separado si es necesario
      }));

      const result: UserListResponse = {
        users: formattedUsers,
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

  static async getById(id: number): Promise<QueryResult<UserType>> {
    try {
      const query = `
        SELECT 
          u.id,
          u.email,
          u.name,
          u.avatar,
          u.active,
          u.last_login,
          u.created_at,
          u.updated_at
        FROM users u
        WHERE u.id = @id
      `;

      const user = await executeQuerySingle<UserType>(query, { id });

      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      // Obtener roles del usuario con detalles completos
      const rolesQuery = `
        SELECT r.id, r.name, r.description
        FROM roles r
        INNER JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = @userId AND r.active = 1
        ORDER BY r.name
      `;
      const roles = await executeQuery<{ id: number; name: string; description?: string }>(rolesQuery, { userId: id });

      // Obtener permisos heredados por roles
      const inheritedPermissionsQuery = `
        SELECT DISTINCT rp.permission_id
        FROM role_permissions rp
        INNER JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = @userId
      `;
      const inheritedPermissions = await executeQuery<{ permission_id: number }>(inheritedPermissionsQuery, { userId: id });

      // Obtener permisos del usuario (directos + por roles)
      const permissionsQuery = `
        SELECT p.id, p.permission_key
        FROM permissions p
        WHERE p.active = 1 
        AND p.id IN (
          SELECT up.permission_id 
          FROM user_permissions up 
          WHERE up.user_id = @userId
          
          UNION
          
          SELECT rp.permission_id 
          FROM role_permissions rp
          INNER JOIN user_roles ur ON rp.role_id = ur.role_id
          WHERE ur.user_id = @userId
        )
        ORDER BY p.permission_key
      `;
      const permissions = await executeQuery<{ id: number; permission_key: string }>(permissionsQuery, { userId: id });

      // Obtener role_ids directos del usuario
      const userRoleIdsQuery = `
        SELECT role_id
        FROM user_roles
        WHERE user_id = @userId
      `;
      const userRoleIds = await executeQuery<{ role_id: number }>(userRoleIdsQuery, { userId: id });

      // Obtener permission_ids directos del usuario
      const userPermissionIdsQuery = `
        SELECT permission_id
        FROM user_permissions
        WHERE user_id = @userId
      `;
      const userPermissionIds = await executeQuery<{ permission_id: number }>(userPermissionIdsQuery, { userId: id });

      const userWithDetails: UserType = {
        ...user,
        roles: roles.map(r => r.name),
        permissions: permissions.map(p => p.permission_key),
        role_ids: userRoleIds.map(r => r.role_id),
        permission_ids: userPermissionIds.map(p => p.permission_id),
        inherited_permissions: inheritedPermissions.map(p => p.permission_id),
        role_details: roles
      };

      return handleQuerySuccess(userWithDetails);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async create(data: UserCreateRequest): Promise<QueryResult<UserType>> {
    try {
      return await executeTransaction(async (transaction) => {
        // Hash de la password
        const hashedPassword = await hashPassword(data.password);

        // Insertar usuario
        const insertQuery = `
          INSERT INTO users (email, password, name, avatar, active)
          OUTPUT INSERTED.id, INSERTED.email, INSERTED.name, INSERTED.avatar, INSERTED.active, INSERTED.created_at, INSERTED.updated_at
          VALUES (@email, @password, @name, @avatar, @active)
        `;

        const request = transaction.request();
        request.input('email', data.email);
        request.input('password', hashedPassword);
        request.input('name', data.name);
        request.input('avatar', data.avatar || null);
        request.input('active', data.active !== false);

        const result = await request.query(insertQuery);
        const newUser = result.recordset[0];

        // Asignar roles si se proporcionaron
        if (data.roleIds && data.roleIds.length > 0) {
          for (const roleId of data.roleIds) {
            const roleRequest = transaction.request();
            roleRequest.input('userId', newUser.id);
            roleRequest.input('roleId', roleId);
            await roleRequest.query('INSERT INTO user_roles (user_id, role_id) VALUES (@userId, @roleId)');
          }
        }

        // Asignar permisos directos si se proporcionaron
        if (data.permissionIds && data.permissionIds.length > 0) {
          for (const permissionId of data.permissionIds) {
            const permRequest = transaction.request();
            permRequest.input('userId', newUser.id);
            permRequest.input('permissionId', permissionId);
            await permRequest.query('INSERT INTO user_permissions (user_id, permission_id) VALUES (@userId, @permissionId)');
          }
        }

        return {
          ...newUser,
          roles: [],
          permissions: []
        };
      });
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async update(id: number, data: UserUpdateRequest): Promise<QueryResult<UserType>> {
    try {
      return await executeTransaction(async (transaction) => {
        const updates: string[] = [];
        const params: Record<string, any> = { id };

        if (data.email !== undefined) {
          updates.push('email = @email');
          params.email = data.email;
        }
        if (data.name !== undefined) {
          updates.push('name = @name');
          params.name = data.name;
        }
        if (data.avatar !== undefined) {
          updates.push('avatar = @avatar');
          params.avatar = data.avatar;
        }
        if (data.active !== undefined) {
          updates.push('active = @active');
          params.active = data.active;
        }
        if (data.password !== undefined) {
          updates.push('password = @password');
          params.password = await hashPassword(data.password);
        }

        // Update user basic info if there are updates
        if (updates.length > 0) {
          updates.push('updated_at = GETDATE()');

          const query = `
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE id = @id AND active = 1
          `;

          const request = transaction.request();
          Object.entries(params).forEach(([key, value]) => {
            request.input(key, value);
          });

          await request.query(query);
        }

        // Update roles if provided
        if (data.roleIds !== undefined) {
          // Delete existing roles
          const deleteRolesRequest = transaction.request();
          deleteRolesRequest.input('userId', id);
          await deleteRolesRequest.query('DELETE FROM user_roles WHERE user_id = @userId');

          // Insert new roles
          for (const roleId of data.roleIds) {
            const insertRoleRequest = transaction.request();
            insertRoleRequest.input('userId', id);
            insertRoleRequest.input('roleId', roleId);
            await insertRoleRequest.query('INSERT INTO user_roles (user_id, role_id) VALUES (@userId, @roleId)');
          }
        }

        // Update permissions if provided
        if (data.permissionIds !== undefined) {
          // Delete existing direct permissions
          const deletePermissionsRequest = transaction.request();
          deletePermissionsRequest.input('userId', id);
          await deletePermissionsRequest.query('DELETE FROM user_permissions WHERE user_id = @userId');

          // Insert new permissions
          for (const permissionId of data.permissionIds) {
            const insertPermissionRequest = transaction.request();
            insertPermissionRequest.input('userId', id);
            insertPermissionRequest.input('permissionId', permissionId);
            await insertPermissionRequest.query('INSERT INTO user_permissions (user_id, permission_id) VALUES (@userId, @permissionId)');
          }
        }

        // Get updated user with full details
        const userResult = await this.getById(id);
        return userResult.data;
      });
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async delete(id: number): Promise<QueryResult<boolean>> {
    try {
      const query = `
        UPDATE users 
        SET active = 0, updated_at = GETDATE()
        WHERE id = @id AND active = 1
      `;

      await executeQuery(query, { id });
      return handleQuerySuccess(true);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async assignRoles(userId: number, roleIds: number[]): Promise<QueryResult<boolean>> {
    try {
      const result = await executeTransaction(async (transaction) => {
        // Eliminar roles existentes
        const deleteRequest = transaction.request();
        deleteRequest.input('userId', userId);
        await deleteRequest.query('DELETE FROM user_roles WHERE user_id = @userId');

        // Insertar nuevos roles
        for (const roleId of roleIds) {
          const insertRequest = transaction.request();
          insertRequest.input('userId', userId);
          insertRequest.input('roleId', roleId);
          await insertRequest.query('INSERT INTO user_roles (user_id, role_id) VALUES (@userId, @roleId)');
        }

        return true;
      });
      
      return handleQuerySuccess(result);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async assignPermissions(userId: number, permissionIds: number[]): Promise<QueryResult<boolean>> {
    try {
      const result = await executeTransaction(async (transaction) => {
        // Eliminar permisos directos existentes
        const deleteRequest = transaction.request();
        deleteRequest.input('userId', userId);
        await deleteRequest.query('DELETE FROM user_permissions WHERE user_id = @userId');

        // Insertar nuevos permisos
        for (const permissionId of permissionIds) {
          const insertRequest = transaction.request();
          insertRequest.input('userId', userId);
          insertRequest.input('permissionId', permissionId);
          await insertRequest.query('INSERT INTO user_permissions (user_id, permission_id) VALUES (@userId, @permissionId)');
        }

        return true;
      });
      
      return handleQuerySuccess(result);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async getRoles(): Promise<QueryResult<{ id: number; name: string; description?: string }[]>> {
    try {
      const query = 'SELECT id, name, description FROM roles WHERE active = 1 ORDER BY name';
      const roles = await executeQuery(query);
      return handleQuerySuccess(roles);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async getPermissions(): Promise<QueryResult<{ id: number; permission_key: string; display_name: string; module: string }[]>> {
    try {
      const query = 'SELECT id, permission_key, display_name, module FROM permissions WHERE active = 1 ORDER BY module, display_name';
      const permissions = await executeQuery(query);
      return handleQuerySuccess(permissions);
    } catch (error) {
      return handleQueryError(error);
    }
  }
}