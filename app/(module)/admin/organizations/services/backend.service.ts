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
import { 
  OrganizationType, 
  OrganizationCreateRequest, 
  OrganizationUpdateRequest, 
  OrganizationSearchParams, 
  OrganizationListResponse,
  OrganizationStatsResponse 
} from '../types';

export class OrganizationBackendService {
  static async getAll(params: OrganizationSearchParams = {}, user?: UserSession): Promise<QueryResult<OrganizationListResponse>> {
    try {
      // Solo Super Admin puede ver organizaciones
      const isSuperAdmin = user?.roles?.includes('Super Admin') || false;
      if (!isSuperAdmin) {
        return { success: false, error: 'Solo Super Admin puede gestionar organizaciones' };
      }

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
      if (active !== undefined) conditions['o.active'] = active;
      
      // Excluir la organización SYSTEM de la lista
      conditions['o.name'] = { operator: '!=', value: 'SYSTEM' };

      const { whereClause, params: whereParams } = buildWhereClause(conditions, 'AND');
      
      // Construir filtros adicionales
      let additionalWhere = '';
      let additionalParams: Record<string, any> = {};
      
      if (search) {
        additionalWhere += (whereClause ? ' AND ' : 'WHERE ') + '(o.name LIKE @search OR o.rut LIKE @search)';
        additionalParams.search = `%${search}%`;
      }

      const finalWhere = whereClause + additionalWhere;
      const allParams = { ...whereParams, ...additionalParams };

      // Query para contar total de registros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM organizations o
        ${finalWhere}
      `;

      const countResult = await executeQuerySingle<{ total: number }>(countQuery, allParams);
      const total = countResult?.total || 0;

      // Query principal con paginación
      const orderBy = buildOrderByClause(sortBy, sortOrder);
      const pagination = buildPaginationClause(page, pageSize);

      const query = `
        SELECT 
          o.id,
          o.name,
          o.logo,
          o.rut,
          o.active,
          o.created_at,
          o.updated_at,
          o.created_by_id,
          o.updated_by_id,
          COUNT(uo.user_id) as userCount
        FROM organizations o
        LEFT JOIN user_organizations uo ON o.id = uo.organization_id AND uo.active = 1
        ${finalWhere}
        GROUP BY o.id, o.name, o.logo, o.rut, o.active, o.created_at, o.updated_at, o.created_by_id, o.updated_by_id
        ${orderBy}
        ${pagination}
      `;

      const organizations = await executeQuery<OrganizationType>(query, allParams);

      const result: OrganizationListResponse = {
        organizations,
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

  static async getById(id: string, user?: UserSession): Promise<QueryResult<OrganizationType>> {
    try {
      // Solo Super Admin puede ver organizaciones
      const isSuperAdmin = user?.roles?.includes('Super Admin') || false;
      if (!isSuperAdmin) {
        return { success: false, error: 'Solo Super Admin puede gestionar organizaciones' };
      }

      const query = `
        SELECT 
          o.id,
          o.name,
          o.logo,
          o.rut,
          o.active,
          o.created_at,
          o.updated_at,
          o.created_by_id,
          o.updated_by_id,
          COUNT(uo.user_id) as userCount
        FROM organizations o
        LEFT JOIN user_organizations uo ON o.id = uo.organization_id AND uo.active = 1
        WHERE o.id = @id
        GROUP BY o.id, o.name, o.logo, o.rut, o.active, o.created_at, o.updated_at, o.created_by_id, o.updated_by_id
      `;

      const organization = await executeQuerySingle<OrganizationType>(query, { id });

      if (!organization) {
        return { success: false, error: 'Organización no encontrada' };
      }

      return handleQuerySuccess(organization);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async create(data: OrganizationCreateRequest, user?: UserSession): Promise<QueryResult<OrganizationType>> {
    try {
      // Solo Super Admin puede crear organizaciones
      const isSuperAdmin = user?.roles?.includes('Super Admin') || false;
      if (!isSuperAdmin) {
        return { success: false, error: 'Solo Super Admin puede crear organizaciones' };
      }

      if (!user?.id) {
        return { success: false, error: 'Usuario no válido' };
      }

      return await executeTransaction(async (transaction) => {
        // Insertar organización
        const insertQuery = `
          INSERT INTO organizations (name, logo, rut, active, created_at, updated_at, created_by_id, updated_by_id)
          OUTPUT INSERTED.id, INSERTED.name, INSERTED.logo, INSERTED.rut, INSERTED.active, 
                 INSERTED.created_at, INSERTED.updated_at, INSERTED.created_by_id, INSERTED.updated_by_id
          VALUES (@name, @logo, @rut, @active, GETDATE(), GETDATE(), @userId, @userId)
        `;

        const request = transaction.request();
        request.input('name', data.name);
        request.input('logo', data.logo || null);
        request.input('rut', data.rut || null);
        request.input('active', data.active !== false);
        request.input('userId', user.id);

        const result = await request.query(insertQuery);
        const newOrganization = result.recordset[0];

        // Agregar userCount para consistencia
        return {
          ...newOrganization,
          userCount: 0
        };
      });
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async update(id: string, data: OrganizationUpdateRequest, user?: UserSession): Promise<QueryResult<OrganizationType>> {
    try {
      // Solo Super Admin puede actualizar organizaciones
      const isSuperAdmin = user?.roles?.includes('Super Admin') || false;
      if (!isSuperAdmin) {
        return { success: false, error: 'Solo Super Admin puede actualizar organizaciones' };
      }

      if (!user?.id) {
        return { success: false, error: 'Usuario no válido' };
      }

      // No permitir actualizar la organización SYSTEM
      const existingOrg = await executeQuerySingle<{ name: string }>(
        'SELECT name FROM organizations WHERE id = @id',
        { id }
      );

      if (!existingOrg) {
        return { success: false, error: 'Organización no encontrada' };
      }

      if (existingOrg.name === 'SYSTEM') {
        return { success: false, error: 'No se puede modificar la organización del sistema' };
      }

      return await executeTransaction(async (transaction) => {
        const updates: string[] = [];
        const params: Record<string, any> = { id, userId: user.id };

        if (data.name !== undefined) {
          updates.push('name = @name');
          params.name = data.name;
        }
        if (data.logo !== undefined) {
          updates.push('logo = @logo');
          params.logo = data.logo;
        }
        if (data.rut !== undefined) {
          updates.push('rut = @rut');
          params.rut = data.rut;
        }
        if (data.active !== undefined) {
          updates.push('active = @active');
          params.active = data.active;
        }

        if (updates.length === 0) {
          return { success: false, error: 'No hay campos para actualizar' };
        }

        updates.push('updated_at = GETDATE()');
        updates.push('updated_by_id = @userId');

        const query = `
          UPDATE organizations 
          SET ${updates.join(', ')}
          OUTPUT INSERTED.id, INSERTED.name, INSERTED.logo, INSERTED.rut, INSERTED.active,
                 INSERTED.created_at, INSERTED.updated_at, INSERTED.created_by_id, INSERTED.updated_by_id
          WHERE id = @id
        `;

        const request = transaction.request();
        Object.entries(params).forEach(([key, value]) => {
          request.input(key, value);
        });

        const result = await request.query(query);
        const updatedOrganization = result.recordset[0];

        if (!updatedOrganization) {
          return { success: false, error: 'Error al actualizar organización' };
        }

        // Obtener userCount
        const userCountResult = await executeQuerySingle<{ count: number }>(
          'SELECT COUNT(*) as count FROM user_organizations WHERE organization_id = @id AND active = 1',
          { id }
        );

        return {
          ...updatedOrganization,
          userCount: userCountResult?.count || 0
        };
      });
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async delete(id: string, user?: UserSession): Promise<QueryResult<boolean>> {
    try {
      // Solo Super Admin puede eliminar organizaciones
      const isSuperAdmin = user?.roles?.includes('Super Admin') || false;
      if (!isSuperAdmin) {
        return { success: false, error: 'Solo Super Admin puede eliminar organizaciones' };
      }

      // No permitir eliminar la organización SYSTEM
      const existingOrg = await executeQuerySingle<{ name: string }>(
        'SELECT name FROM organizations WHERE id = @id',
        { id }
      );

      if (!existingOrg) {
        return { success: false, error: 'Organización no encontrada' };
      }

      if (existingOrg.name === 'SYSTEM') {
        return { success: false, error: 'No se puede eliminar la organización del sistema' };
      }

      // Verificar si la organización tiene usuarios activos
      const userCount = await executeQuerySingle<{ count: number }>(
        'SELECT COUNT(*) as count FROM user_organizations WHERE organization_id = @id AND active = 1',
        { id }
      );

      if (userCount && userCount.count > 0) {
        return { success: false, error: 'No se puede eliminar una organización que tiene usuarios activos' };
      }

      const query = `
        UPDATE organizations 
        SET active = 0, updated_at = GETDATE(), updated_by_id = @userId
        WHERE id = @id
      `;

      await executeQuery(query, { id, userId: user?.id });
      return handleQuerySuccess(true);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async getStats(user?: UserSession): Promise<QueryResult<OrganizationStatsResponse>> {
    try {
      // Solo Super Admin puede ver estadísticas
      const isSuperAdmin = user?.roles?.includes('Super Admin') || false;
      if (!isSuperAdmin) {
        return { success: false, error: 'Solo Super Admin puede ver estadísticas de organizaciones' };
      }

      const query = `
        SELECT 
          COUNT(*) as totalOrganizations,
          COUNT(CASE WHEN active = 1 THEN 1 END) as activeOrganizations,
          (SELECT COUNT(*) FROM users WHERE active = 1) as totalUsers,
          CASE 
            WHEN COUNT(CASE WHEN active = 1 THEN 1 END) > 0 
            THEN (SELECT COUNT(*) FROM users WHERE active = 1) / COUNT(CASE WHEN active = 1 THEN 1 END)
            ELSE 0 
          END as averageUsersPerOrg
        FROM organizations 
        WHERE name != 'SYSTEM'
      `;

      const stats = await executeQuerySingle<OrganizationStatsResponse>(query);

      if (!stats) {
        return { success: false, error: 'Error al obtener estadísticas' };
      }

      return handleQuerySuccess(stats);
    } catch (error) {
      return handleQueryError(error);
    }
  }
}