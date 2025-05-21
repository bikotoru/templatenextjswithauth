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
import { RoleType, RoleCreateRequest, RoleUpdateRequest, RoleSearchParams, RoleListResponse } from '../types';

export class RoleBackendService {
  static async getAll(params: RoleSearchParams = {}): Promise<QueryResult<RoleListResponse>> {
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
      const conditions: Record<string, any> = {};
      if (active !== undefined) conditions['r.active'] = active;

      const { whereClause, params: whereParams } = buildWhereClause(conditions, 'AND');
      
      // Construir filtros adicionales
      let additionalWhere = '';
      let additionalParams: Record<string, any> = {};
      
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
          r.active,
          r.created_at,
          r.updated_at,
          COUNT(ur.user_id) as userCount
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.role_id
        ${finalWhere}
        GROUP BY r.id, r.name, r.description, r.active, r.created_at, r.updated_at
        ${orderBy}
        ${pagination}
      `;

      const roles = await executeQuery<RoleType & { userCount: number }>(query, allParams);

      // Obtener permisos para cada rol
      const rolesWithPermissions: RoleType[] = await Promise.all(
        roles.map(async (role) => {
          const permissions = await executeQuery<{ permission_key: string }>(
            `SELECT p.permission_key
             FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             WHERE rp.role_id = @roleId AND p.active = 1
             ORDER BY p.permission_key`,
            { roleId: role.id }
          );

          return {
            ...role,
            permissions: permissions.map(p => p.permission_key),
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
        LEFT JOIN user_roles ur ON r.id = ur.role_id
        WHERE r.id = @id
        GROUP BY r.id, r.name, r.description, r.active, r.created_at, r.updated_at
      `;

      const role = await executeQuerySingle<RoleType & { userCount: number }>(query, { id });

      if (!role) {
        return { success: false, error: 'Rol no encontrado' };
      }

      // Obtener permisos del rol
      const permissions = await executeQuery<{ permission_key: string }>(
        `SELECT p.permission_key
         FROM permissions p
         INNER JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = @roleId AND p.active = 1
         ORDER BY p.permission_key`,
        { roleId: id }
      );

      const roleWithPermissions: RoleType = {
        ...role,
        permissions: permissions.map(p => p.permission_key)
      };

      return handleQuerySuccess(roleWithPermissions);
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
            await permRequest.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (@roleId, @permissionId)');
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
      const updates: string[] = [];
      const params: Record<string, any> = { id };

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

      if (updates.length === 0) {
        return { success: false, error: 'No hay campos para actualizar' };
      }

      updates.push('updated_at = GETDATE()');

      const query = `
        UPDATE roles 
        SET ${updates.join(', ')}
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.active, INSERTED.created_at, INSERTED.updated_at
        WHERE id = @id AND active = 1
      `;

      const result = await executeQuerySingle<RoleType>(query, params);

      if (!result) {
        return { success: false, error: 'Rol no encontrado' };
      }

      return handleQuerySuccess({ ...result, permissions: [], userCount: 0 });
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async delete(id: number): Promise<QueryResult<boolean>> {
    try {
      // Verificar si el rol tiene usuarios asignados
      const userCount = await executeQuerySingle<{ count: number }>(
        'SELECT COUNT(*) as count FROM user_roles WHERE role_id = @id',
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
        // Eliminar permisos existentes
        const deleteRequest = transaction.request();
        deleteRequest.input('roleId', roleId);
        await deleteRequest.query('DELETE FROM role_permissions WHERE role_id = @roleId');

        // Insertar nuevos permisos
        for (const permissionId of permissionIds) {
          const insertRequest = transaction.request();
          insertRequest.input('roleId', roleId);
          insertRequest.input('permissionId', permissionId);
          await insertRequest.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (@roleId, @permissionId)');
        }

        return true;
      });
      
      return handleQuerySuccess(result);
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

  static async getRolePermissions(roleId: number): Promise<QueryResult<number[]>> {
    try {
      const query = `
        SELECT permission_id 
        FROM role_permissions 
        WHERE role_id = @roleId
      `;
      const permissions = await executeQuery<{ permission_id: number }>(query, { roleId });
      return handleQuerySuccess(permissions.map(p => p.permission_id));
    } catch (error) {
      return handleQueryError(error);
    }
  }
}