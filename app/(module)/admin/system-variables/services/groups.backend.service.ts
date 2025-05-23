import { 
  executeQuery, 
  executeQuerySingle, 
  buildWhereClause,
  QueryResult,
  handleQueryError,
  handleQuerySuccess
} from '@/utils/sql';
import { UserSession } from '@/utils/auth';
import {
  SystemVariableGroup,
  CreateGroupRequest,
  UpdateGroupRequest,
  GroupSearchParams,
  GroupListResponse
} from '../types';

export class SystemVariableGroupsBackendService {
  
  // =============================================
  // Métodos CRUD principales
  // =============================================
  
  static async getAll(
    params: GroupSearchParams = {},
    _user: UserSession // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<QueryResult<GroupListResponse>> {
    try {
      const {
        search,
        active,
        page = 1,
        pageSize = 50,
        sortBy = 'display_order',
        sortOrder = 'ASC'
      } = params;

      // Construir condiciones WHERE
      const conditions: Record<string, unknown> = {};
      
      if (active !== undefined) conditions['g.active'] = active;

      const { whereClause, params: whereParams } = buildWhereClause(conditions, 'AND');

      // Construir filtros adicionales
      let additionalWhere = '';
      const additionalParams: Record<string, unknown> = {};

      if (search) {
        additionalWhere = `AND (g.name LIKE @search OR g.description LIKE @search)`;
        additionalParams.search = `%${search}%`;
      }

      // Construir ORDER BY y PAGINATION
      const qualifiedSortBy = sortBy.includes('.') ? sortBy : `g.${sortBy}`;
      const orderByClause = `ORDER BY ${qualifiedSortBy} ${sortOrder}`;
      const offset = (page - 1) * pageSize;
      const paginationClause = `OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;

      // Query principal
      const query = `
        SELECT 
          g.*,
          COUNT(sv.id) as variable_count,
          -- Usuario que creó
          u_created.name as created_by_name,
          -- Usuario que actualizó
          u_updated.name as updated_by_name
        FROM system_variable_groups g
        LEFT JOIN system_variables sv ON g.id = sv.group_id AND sv.is_active = 1
        LEFT JOIN users u_created ON g.created_by_id = u_created.id
        LEFT JOIN users u_updated ON g.updated_by_id = u_updated.id
        ${whereClause} ${additionalWhere}
        GROUP BY g.id, g.name, g.description, g.display_order, g.active, 
                 g.created_at, g.updated_at, g.created_by_id, g.updated_by_id,
                 u_created.name, u_updated.name
        ${orderByClause}
        ${paginationClause}
      `;

      // Query para contar total
      const countQuery = `
        SELECT COUNT(DISTINCT g.id) as total
        FROM system_variable_groups g
        ${whereClause} ${additionalWhere}
      `;

      const allParams = { ...whereParams, ...additionalParams };

      const [groups, countResult] = await Promise.all([
        executeQuery<Record<string, unknown>>(query, allParams),
        executeQuerySingle<{ total: number }>(countQuery, allParams)
      ]);

      // Procesar resultados
      const processedGroups = groups.map(row => this.mapRowToGroup(row));
      
      const totalPages = Math.ceil((countResult?.total || 0) / pageSize);

      const response: GroupListResponse = {
        groups: processedGroups,
        pagination: {
          page,
          pageSize,
          total: countResult?.total || 0,
          totalPages
        }
      };

      return handleQuerySuccess(response);

    } catch (error) {
      console.error('Error in SystemVariableGroupsBackendService.getAll:', error);
      return handleQueryError(error);
    }
  }

  static async getById(
    id: number,
    _user: UserSession // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<QueryResult<SystemVariableGroup>> {
    try {
      const query = `
        SELECT 
          g.*,
          COUNT(sv.id) as variable_count,
          -- Usuario que creó
          u_created.name as created_by_name,
          -- Usuario que actualizó
          u_updated.name as updated_by_name
        FROM system_variable_groups g
        LEFT JOIN system_variables sv ON g.id = sv.group_id AND sv.is_active = 1
        LEFT JOIN users u_created ON g.created_by_id = u_created.id
        LEFT JOIN users u_updated ON g.updated_by_id = u_updated.id
        WHERE g.id = @id
        GROUP BY g.id, g.name, g.description, g.display_order, g.active, 
                 g.created_at, g.updated_at, g.created_by_id, g.updated_by_id,
                 u_created.name, u_updated.name
      `;

      const result = await executeQuerySingle<Record<string, unknown>>(query, { id });
      
      if (!result) {
        return handleQueryError(new Error('Grupo no encontrado'));
      }

      const group = this.mapRowToGroup(result);
      return handleQuerySuccess(group);

    } catch (error) {
      console.error('Error in SystemVariableGroupsBackendService.getById:', error);
      return handleQueryError(error);
    }
  }

  static async create(
    data: CreateGroupRequest,
    user: UserSession
  ): Promise<QueryResult<SystemVariableGroup>> {
    try {
      const {
        name,
        description,
        display_order = 0
      } = data;

      // Verificar que el nombre no existe
      const existingGroup = await executeQuerySingle<{ id: number }>(
        'SELECT id FROM system_variable_groups WHERE name = @name AND active = 1',
        { name }
      );

      if (existingGroup) {
        return handleQueryError(new Error('Ya existe un grupo con ese nombre'));
      }

      // Crear el grupo
      const query = `
        INSERT INTO system_variable_groups 
        (name, description, display_order, active, created_at, updated_at, created_by_id, updated_by_id)
        OUTPUT INSERTED.id
        VALUES (@name, @description, @display_order, 1, GETDATE(), GETDATE(), @userId, @userId)
      `;

      const result = await executeQuerySingle<{ id: number }>(query, {
        name,
        description,
        display_order,
        userId: user.id
      });

      if (!result?.id) {
        return handleQueryError(new Error('Error al crear el grupo'));
      }

      // Obtener el grupo creado
      const createdGroup = await this.getById(result.id, user);
      
      if (!createdGroup.success || !createdGroup.data) {
        return handleQueryError(new Error('Error al recuperar el grupo creado'));
      }

      return handleQuerySuccess(createdGroup.data);

    } catch (error) {
      console.error('Error in SystemVariableGroupsBackendService.create:', error);
      return handleQueryError(error);
    }
  }

  static async update(
    id: number,
    data: UpdateGroupRequest,
    user: UserSession
  ): Promise<QueryResult<SystemVariableGroup>> {
    try {
      const updateFields: string[] = [];
      const updateParams: Record<string, unknown> = { id, userId: user.id };

      // Construir campos a actualizar
      if (data.name !== undefined) {
        // Verificar que el nombre no existe (excepto el actual)
        const existingGroup = await executeQuerySingle<{ id: number }>(
          'SELECT id FROM system_variable_groups WHERE name = @name AND id != @id AND active = 1',
          { name: data.name, id }
        );

        if (existingGroup) {
          return handleQueryError(new Error('Ya existe un grupo con ese nombre'));
        }

        updateFields.push('name = @name');
        updateParams.name = data.name;
      }

      if (data.description !== undefined) {
        updateFields.push('description = @description');
        updateParams.description = data.description;
      }

      if (data.display_order !== undefined) {
        updateFields.push('display_order = @display_order');
        updateParams.display_order = data.display_order;
      }

      if (data.active !== undefined) {
        updateFields.push('active = @active');
        updateParams.active = data.active;
      }

      if (updateFields.length === 0) {
        return handleQueryError(new Error('No hay campos para actualizar'));
      }

      // Agregar campos de auditoría
      updateFields.push('updated_at = GETDATE()');
      updateFields.push('updated_by_id = @userId');

      const query = `
        UPDATE system_variable_groups 
        SET ${updateFields.join(', ')}
        WHERE id = @id
      `;

      await executeQuery(query, updateParams);

      // Obtener el grupo actualizado
      const updatedGroup = await this.getById(id, user);
      
      if (!updatedGroup.success || !updatedGroup.data) {
        return handleQueryError(new Error('Error al recuperar el grupo actualizado'));
      }

      return handleQuerySuccess(updatedGroup.data);

    } catch (error) {
      console.error('Error in SystemVariableGroupsBackendService.update:', error);
      return handleQueryError(error);
    }
  }

  static async delete(
    id: number,
    user: UserSession
  ): Promise<QueryResult<boolean>> {
    try {
      // Verificar que no tiene variables asociadas
      const variableCount = await executeQuerySingle<{ count: number }>(
        'SELECT COUNT(*) as count FROM system_variables WHERE group_id = @id AND is_active = 1',
        { id }
      );

      if ((variableCount?.count || 0) > 0) {
        return handleQueryError(new Error('No se puede eliminar un grupo que tiene variables asociadas'));
      }

      // Marcar como inactivo en lugar de eliminar físicamente
      const query = `
        UPDATE system_variable_groups 
        SET active = 0, updated_at = GETDATE(), updated_by_id = @userId
        WHERE id = @id
      `;

      await executeQuery(query, { id, userId: user.id });

      return handleQuerySuccess(true);

    } catch (error) {
      console.error('Error in SystemVariableGroupsBackendService.delete:', error);
      return handleQueryError(error);
    }
  }

  // =============================================
  // Métodos auxiliares
  // =============================================

  private static mapRowToGroup(row: Record<string, unknown>): SystemVariableGroup {
    return {
      id: Number(row.id),
      name: String(row.name),
      description: row.description ? String(row.description) : undefined,
      display_order: Number(row.display_order),
      active: Boolean(row.active),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      created_by_id: Number(row.created_by_id),
      updated_by_id: Number(row.updated_by_id),
      variable_count: Number(row.variable_count || 0)
    };
  }

  static async getGroupOptions(): Promise<QueryResult<Pick<SystemVariableGroup, 'id' | 'name' | 'display_order'>[]>> {
    try {
      const query = `
        SELECT id, name, display_order
        FROM system_variable_groups
        WHERE active = 1
        ORDER BY display_order ASC, name ASC
      `;

      const results = await executeQuery<{ id: number; name: string; display_order: number }>(query);
      
      return handleQuerySuccess(results);

    } catch (error) {
      console.error('Error in SystemVariableGroupsBackendService.getGroupOptions:', error);
      return handleQueryError(error);
    }
  }
}