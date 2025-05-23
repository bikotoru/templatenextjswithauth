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
import bcrypt from 'bcryptjs';
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
        expired,
        expiringThisMonth,
        page = 1,
        pageSize = 10,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = params;

      // Construir condiciones WHERE
      const conditions: Record<string, unknown> = {};
      if (active !== undefined) conditions['o.active'] = active;

      const { whereClause, params: whereParams } = buildWhereClause(conditions, 'AND');
      
      // Construir filtros adicionales
      let additionalWhere = '';
      const additionalParams: Record<string, unknown> = {};
      
      // Siempre excluir la organización SYSTEM
      const systemFilter = "o.name != @systemName";
      additionalParams.systemName = 'SYSTEM';
      
      if (search) {
        additionalWhere += ' AND (o.name LIKE @search OR o.rut LIKE @search)';
        additionalParams.search = `%${search}%`;
      }
      
      // Filtro por organizaciones expiradas
      if (expired !== undefined) {
        if (expired) {
          additionalWhere += ' AND (o.expires_at IS NOT NULL AND o.expires_at < GETDATE())';
        } else {
          additionalWhere += ' AND (o.expires_at IS NULL OR o.expires_at >= GETDATE())';
        }
      }
      
      // Filtro por organizaciones que expiran este mes
      if (expiringThisMonth !== undefined && expiringThisMonth) {
        additionalWhere += ' AND (o.expires_at IS NOT NULL AND o.expires_at BETWEEN GETDATE() AND DATEADD(month, 1, GETDATE()))';
      }

      // Combinar todos los filtros
      let finalWhere = '';
      if (whereClause) {
        finalWhere = `${whereClause} AND ${systemFilter}${additionalWhere}`;
      } else {
        finalWhere = `WHERE ${systemFilter}${additionalWhere}`;
      }
      
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
          o.expires_at,
          o.created_at,
          o.updated_at,
          o.created_by_id,
          o.updated_by_id,
          COUNT(uo.user_id) as userCount
        FROM organizations o
        LEFT JOIN user_organizations uo ON o.id = uo.organization_id AND uo.active = 1
        ${finalWhere}
        GROUP BY o.id, o.name, o.logo, o.rut, o.active, o.expires_at, o.created_at, o.updated_at, o.created_by_id, o.updated_by_id
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
          o.expires_at,
          o.created_at,
          o.updated_at,
          o.created_by_id,
          o.updated_by_id,
          COUNT(uo.user_id) as userCount
        FROM organizations o
        LEFT JOIN user_organizations uo ON o.id = uo.organization_id AND uo.active = 1
        WHERE o.id = @id
        GROUP BY o.id, o.name, o.logo, o.rut, o.active, o.expires_at, o.created_at, o.updated_at, o.created_by_id, o.updated_by_id
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
        // Verificar si ya existe una organización con el mismo nombre
        const checkOrgNameQuery = `
          SELECT id FROM organizations WHERE name = @name AND active = 1
        `;
        
        const checkOrgNameRequest = transaction.request();
        checkOrgNameRequest.input('name', data.name);
        
        const existingOrg = await checkOrgNameRequest.query(checkOrgNameQuery);
        
        if (existingOrg.recordset.length > 0) {
          return {
            success: false,
            error: `Ya existe una organización con el nombre "${data.name}". Por favor, use un nombre diferente.`
          };
        }

        // Insertar organización
        const insertOrgQuery = `
          INSERT INTO organizations (name, logo, rut, active, expires_at, created_at, updated_at, created_by_id, updated_by_id)
          OUTPUT INSERTED.id, INSERTED.name, INSERTED.logo, INSERTED.rut, INSERTED.active, INSERTED.expires_at,
                 INSERTED.created_at, INSERTED.updated_at, INSERTED.created_by_id, INSERTED.updated_by_id
          VALUES (@name, @logo, @rut, @active, @expires_at, GETDATE(), GETDATE(), @userId, @userId)
        `;

        const orgRequest = transaction.request();
        orgRequest.input('name', data.name);
        orgRequest.input('logo', data.logo || null);
        orgRequest.input('rut', data.rut || null);
        orgRequest.input('active', data.active !== false);
        orgRequest.input('expires_at', data.expires_at || null);
        orgRequest.input('userId', user.id);

        const orgResult = await orgRequest.query(insertOrgQuery);
        const newOrganization = orgResult.recordset[0];

        let adminUserId: number;

        // Crear o obtener el usuario administrador
        if (data.adminUser.type === 'new' && data.adminUser.newUser) {
          // Verificar si el email ya existe
          const checkEmailQuery = `
            SELECT id FROM users WHERE email = @email
          `;
          
          const checkEmailRequest = transaction.request();
          checkEmailRequest.input('email', data.adminUser.newUser.email);
          
          const existingUser = await checkEmailRequest.query(checkEmailQuery);
          
          if (existingUser.recordset.length > 0) {
            return {
              success: false,
              error: `El email "${data.adminUser.newUser.email}" ya está registrado en el sistema. Por favor, use un email diferente o seleccione el usuario existente.`
            };
          }

          // Crear nuevo usuario
          const hashedPassword = await bcrypt.hash(data.adminUser.newUser.password, 12);

          const insertUserQuery = `
            INSERT INTO users (email, password_hash, name, active, created_at, updated_at, created_by_id, updated_by_id)
            OUTPUT INSERTED.id
            VALUES (@email, @password_hash, @name, 1, GETDATE(), GETDATE(), @userId, @userId)
          `;

          const userRequest = transaction.request();
          userRequest.input('email', data.adminUser.newUser.email);
          userRequest.input('password_hash', hashedPassword);
          userRequest.input('name', data.adminUser.newUser.name);
          userRequest.input('userId', user.id);

          const userResult = await userRequest.query(insertUserQuery);
          adminUserId = userResult.recordset[0].id;
        } else if (data.adminUser.type === 'existing' && data.adminUser.existingUserId) {
          // Verificar que el usuario existente sea válido y esté activo
          const checkUserQuery = `
            SELECT id, email, name, active FROM users WHERE id = @userId
          `;
          
          const checkUserRequest = transaction.request();
          checkUserRequest.input('userId', data.adminUser.existingUserId);
          
          const existingUserResult = await checkUserRequest.query(checkUserQuery);
          
          if (existingUserResult.recordset.length === 0) {
            return {
              success: false,
              error: 'El usuario seleccionado no existe en el sistema.'
            };
          }
          
          const existingUserData = existingUserResult.recordset[0];
          if (!existingUserData.active) {
            return {
              success: false,
              error: `El usuario "${existingUserData.name}" (${existingUserData.email}) está desactivado y no puede ser asignado como administrador.`
            };
          }
          
          adminUserId = data.adminUser.existingUserId;
        } else {
          throw new Error('Configuración de administrador inválida');
        }

        // Crear permisos básicos para la organización
        const basicPermissions = [
          { name: 'admin:access', description: 'Acceso al panel de administración', category: 'admin' },
          { name: 'dashboard:view', description: 'Ver dashboard', category: 'dashboard' },
          { name: 'users:view', description: 'Ver usuarios', category: 'users' },
          { name: 'users:create', description: 'Crear usuarios', category: 'users' },
          { name: 'users:edit', description: 'Editar usuarios', category: 'users' },
          { name: 'users:delete', description: 'Eliminar usuarios', category: 'users' },
          { name: 'roles:view', description: 'Ver roles', category: 'roles' },
          { name: 'roles:create', description: 'Crear roles', category: 'roles' },
          { name: 'roles:edit', description: 'Editar roles', category: 'roles' },
          { name: 'roles:delete', description: 'Eliminar roles', category: 'roles' },
          { name: 'permissions:view', description: 'Ver permisos', category: 'permissions' },
        ];

        const permissionIds: number[] = [];
        for (const permission of basicPermissions) {
          const insertPermQuery = `
            INSERT INTO permissions (name, description, category, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id)
            OUTPUT INSERTED.id
            VALUES (@name, @description, @category, @organizationId, 0, 1, GETDATE(), GETDATE(), @userId, @userId)
          `;

          const permRequest = transaction.request();
          permRequest.input('name', permission.name);
          permRequest.input('description', permission.description);
          permRequest.input('category', permission.category);
          permRequest.input('organizationId', newOrganization.id);
          permRequest.input('userId', user.id);

          const permResult = await permRequest.query(insertPermQuery);
          permissionIds.push(permResult.recordset[0].id);
        }

        // Crear rol Admin para la organización
        const insertRoleQuery = `
          INSERT INTO roles (name, description, type, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id)
          OUTPUT INSERTED.id
          VALUES (@name, @description, @type, @organizationId, 0, 1, GETDATE(), GETDATE(), @userId, @userId)
        `;

        const roleRequest = transaction.request();
        roleRequest.input('name', 'Admin');
        roleRequest.input('description', 'Administrador de la organización');
        roleRequest.input('type', 'permissions');
        roleRequest.input('organizationId', newOrganization.id);
        roleRequest.input('userId', user.id);

        const roleResult = await roleRequest.query(insertRoleQuery);
        const adminRoleId = roleResult.recordset[0].id;

        // Asignar todos los permisos al rol Admin
        for (const permissionId of permissionIds) {
          const insertRolePermQuery = `
            INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, assigned_at, active, created_at, updated_at, created_by_id, updated_by_id)
            VALUES (@roleId, @permissionId, @organizationId, GETDATE(), 1, GETDATE(), GETDATE(), @userId, @userId)
          `;

          const rolePermRequest = transaction.request();
          rolePermRequest.input('roleId', adminRoleId);
          rolePermRequest.input('permissionId', permissionId);
          rolePermRequest.input('organizationId', newOrganization.id);
          rolePermRequest.input('userId', user.id);

          await rolePermRequest.query(insertRolePermQuery);
        }

        // Verificar si el usuario ya pertenece a la organización (aunque es nueva, por si acaso)
        const checkUserOrgQuery = `
          SELECT id FROM user_organizations 
          WHERE user_id = @adminUserId AND organization_id = @organizationId
        `;
        
        const checkUserOrgRequest = transaction.request();
        checkUserOrgRequest.input('adminUserId', adminUserId);
        checkUserOrgRequest.input('organizationId', newOrganization.id);
        
        const existingUserOrg = await checkUserOrgRequest.query(checkUserOrgQuery);
        
        if (existingUserOrg.recordset.length === 0) {
          // Asignar el usuario administrador a la organización
          const insertUserOrgQuery = `
            INSERT INTO user_organizations (user_id, organization_id, joined_at, active, created_at, updated_at, created_by_id, updated_by_id)
            VALUES (@adminUserId, @organizationId, GETDATE(), 1, GETDATE(), GETDATE(), @userId, @userId)
          `;

          const userOrgRequest = transaction.request();
          userOrgRequest.input('adminUserId', adminUserId);
          userOrgRequest.input('organizationId', newOrganization.id);
          userOrgRequest.input('userId', user.id);

          await userOrgRequest.query(insertUserOrgQuery);
        }

        // Asignar el rol Admin al usuario administrador
        const insertUserRoleQuery = `
          INSERT INTO user_role_assignments (user_id, role_id, organization_id, assigned_at, active, created_at, updated_at, created_by_id, updated_by_id)
          VALUES (@adminUserId, @roleId, @organizationId, GETDATE(), 1, GETDATE(), GETDATE(), @userId, @userId)
        `;

        const userRoleRequest = transaction.request();
        userRoleRequest.input('adminUserId', adminUserId);
        userRoleRequest.input('roleId', adminRoleId);
        userRoleRequest.input('organizationId', newOrganization.id);
        userRoleRequest.input('userId', user.id);

        await userRoleRequest.query(insertUserRoleQuery);

        // Agregar userCount para consistencia
        return {
          ...newOrganization,
          userCount: 1
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
        const params: Record<string, unknown> = { id, userId: user.id };

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
        if (data.expires_at !== undefined) {
          updates.push('expires_at = @expires_at');
          params.expires_at = data.expires_at;
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
          COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < GETDATE() THEN 1 END) as expiredOrganizations,
          COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at BETWEEN GETDATE() AND DATEADD(month, 1, GETDATE()) THEN 1 END) as expiringThisMonth,
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

  static async getOrganizationUsers(organizationId: string, user?: UserSession): Promise<QueryResult<unknown[]>> {
    try {
      // Solo Super Admin puede ver usuarios de organizaciones
      const isSuperAdmin = user?.roles?.includes('Super Admin') || false;
      if (!isSuperAdmin) {
        return { success: false, error: 'Solo Super Admin puede ver usuarios de organizaciones' };
      }

      const query = `
        SELECT 
          u.id,
          u.email,
          u.name,
          u.avatar,
          u.active,
          u.created_at,
          u.updated_at,
          uo.joined_at,
          STUFF((
            SELECT ', ' + r.name
            FROM user_role_assignments ura
            JOIN roles r ON ura.role_id = r.id
            WHERE ura.user_id = u.id AND ura.organization_id = @organizationId
            FOR XML PATH('')
          ), 1, 2, '') as roles_string
        FROM users u
        INNER JOIN user_organizations uo ON u.id = uo.user_id
        WHERE uo.organization_id = @organizationId 
          AND uo.active = 1
        ORDER BY uo.joined_at DESC
      `;

      const users = await executeQuery<Record<string, unknown>>(query, { organizationId });

      // Procesar los resultados para incluir roles como array
      const processedUsers = users.map(user => ({
        ...user,
        roles: typeof user.roles_string === 'string' ? user.roles_string.split(', ') : []
      }));

      return handleQuerySuccess(processedUsers);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async assignUserToOrganization(organizationId: string, userId: number, currentUserId: number): Promise<QueryResult<boolean>> {
    try {
      const result = await executeTransaction(async (transaction) => {
        // Verificar si el usuario ya está en la organización
        const checkQuery = `
          SELECT id, active 
          FROM user_organizations 
          WHERE user_id = @userId AND organization_id = @organizationId
        `;

        const request = transaction.request();
        request.input('userId', userId);
        request.input('organizationId', organizationId);
        request.input('currentUserId', currentUserId);

        const existing = await request.query(checkQuery);

        if (existing.recordset.length > 0) {
          if (existing.recordset[0].active) {
            return { success: false, error: 'El usuario ya pertenece a esta organización' };
          } else {
            // Reactivar la relación
            const updateQuery = `
              UPDATE user_organizations 
              SET active = 1, 
                  updated_at = GETDATE(),
                  updated_by_id = @currentUserId
              WHERE user_id = @userId AND organization_id = @organizationId
            `;
            await request.query(updateQuery);
            return true;
          }
        }

        // Insertar nueva relación
        const insertQuery = `
          INSERT INTO user_organizations (user_id, organization_id, joined_at, created_at, updated_at, created_by_id, updated_by_id)
          VALUES (@userId, @organizationId, GETDATE(), GETDATE(), GETDATE(), @currentUserId, @currentUserId)
        `;

        await request.query(insertQuery);
        return true;
      });

      if (typeof result === 'boolean') {
        return handleQuerySuccess(result);
      } else {
        return result;
      }
    } catch (error) {
      return handleQueryError(error);
    }
  }
}