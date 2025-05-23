import { 
  executeQuery, 
  executeQuerySingle, 
  executeTransaction, 
  buildWhereClause,
  QueryResult,
  handleQueryError,
  handleQuerySuccess
} from '@/utils/sql';
import { UserSession } from '@/utils/auth';
import {
  SystemVariable,
  CreateVariableRequest,
  UpdateVariableRequest,
  SetVariableValueRequest,
  GenerateNumberRequest,
  GenerateNumberResponse,
  VariableSearchParams,
  VariableListResponse,
  ValidationResult,
  VariableType,
  ValidationType,
  VariableCategory,
  ResetFrequency
} from '../types';

export class SystemVariableBackendService {
  
  // =============================================
  // Métodos CRUD principales
  // =============================================
  
  static async getAll(
    organizationId: string, 
    params: VariableSearchParams = {},
    user: UserSession
  ): Promise<QueryResult<VariableListResponse>> {
    try {
      const {
        search,
        category,
        variable_type,
        group_id,
        is_active,
        is_editable,
        system_level_only,
        page = 1,
        pageSize = 20,
        sortBy = 'display_name',
        sortOrder = 'ASC',
        group_by = 'none'
      } = params;

      // Verificar si el usuario es Super Admin
      const isSuperAdmin = user.roles?.includes('Super Admin') || false;

      // Construir condiciones WHERE
      const conditions: Record<string, unknown> = {
        'sv.organization_id': organizationId
      };

      if (category) conditions['sv.category'] = category;
      if (variable_type) conditions['sv.variable_type'] = variable_type;
      if (group_id) conditions['sv.group_id'] = group_id;
      if (is_active !== undefined) conditions['sv.is_active'] = is_active;
      if (is_editable !== undefined) conditions['sv.is_editable'] = is_editable;
      if (system_level_only !== undefined) conditions['sv.system_level_only'] = system_level_only;

      const { whereClause, params: whereParams } = buildWhereClause(conditions, 'AND');

      // Construir filtros adicionales
      let additionalWhere = '';
      const additionalParams: Record<string, unknown> = {};

      if (search) {
        additionalWhere = `AND (sv.display_name LIKE @search OR sv.variable_key LIKE @search OR sv.description LIKE @search)`;
        additionalParams.search = `%${search}%`;
      }

      // Construir ORDER BY y PAGINATION
      const orderByClause = `ORDER BY sv.${sortBy} ${sortOrder}`;
      const offset = (page - 1) * pageSize;
      const paginationClause = `OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;

      // Query principal con todas las relaciones
      const query = `
        SELECT 
          sv.*,
          -- Grupo
          svg.id as group_id,
          svg.name as group_name,
          svg.display_order as group_order,
          -- Configuración incremental
          sic.id as inc_id,
          sic.prefix,
          sic.suffix,
          sic.current_number,
          sic.number_length,
          sic.reset_frequency,
          sic.last_reset_date,
          -- Valor actual
          svv.id as val_id,
          svv.text_value,
          svv.number_value,
          svv.date_value,
          svv.boolean_value,
          svv.updated_at as value_updated_at,
          -- Usuario que creó
          u_created.name as created_by_name,
          -- Usuario que actualizó
          u_updated.name as updated_by_name
        FROM system_variables sv
        LEFT JOIN system_variable_groups svg ON sv.group_id = svg.id
        LEFT JOIN system_variable_incremental_config sic ON sv.id = sic.system_variable_id
        LEFT JOIN system_variable_values svv ON sv.id = svv.system_variable_id
        LEFT JOIN users u_created ON sv.created_by_id = u_created.id
        LEFT JOIN users u_updated ON sv.updated_by_id = u_updated.id
        ${whereClause} ${additionalWhere}
        ${orderByClause}
        ${paginationClause}
      `;

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM system_variables sv
        ${whereClause} ${additionalWhere}
      `;

      const allParams = { ...whereParams, ...additionalParams, offset, pageSize };

      const [variables, countResult] = await Promise.all([
        executeQuery<Record<string, unknown>>(query, allParams),
        executeQuerySingle<{ total: number }>(countQuery, { ...whereParams, ...additionalParams })
      ]);

      // Procesar resultados
      const processedVariables = variables.map(row => this.mapRowToVariable(row));

      // Para cada variable, obtener sus validaciones
      const variablesWithValidations = await Promise.all(
        processedVariables.map(async (variable) => {
          const validations = await this.getVariableValidations(variable.id);
          return {
            ...variable,
            validations
          };
        })
      );

      const total = countResult?.total || 0;
      const totalPages = Math.ceil(total / pageSize);

      const response: VariableListResponse = {
        variables: variablesWithValidations,
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        }
      };

      return handleQuerySuccess(response);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async getById(id: number, organizationId: string): Promise<QueryResult<SystemVariable>> {
    try {
      const query = `
        SELECT 
          sv.*,
          -- Configuración incremental
          sic.id as inc_id,
          sic.prefix,
          sic.suffix,
          sic.current_number,
          sic.number_length,
          sic.reset_frequency,
          sic.last_reset_date,
          -- Valor actual
          svv.id as val_id,
          svv.text_value,
          svv.number_value,
          svv.date_value,
          svv.boolean_value,
          svv.updated_at as value_updated_at
        FROM system_variables sv
        LEFT JOIN system_variable_incremental_config sic ON sv.id = sic.system_variable_id
        LEFT JOIN system_variable_values svv ON sv.id = svv.system_variable_id
        WHERE sv.id = @id AND sv.organization_id = @organizationId
      `;

      const row = await executeQuerySingle<Record<string, unknown>>(query, { id, organizationId });
      
      if (!row) {
        return {
          success: false,
          error: 'Variable no encontrada'
        };
      }

      const variable = this.mapRowToVariable(row);
      
      // Obtener validaciones
      const validations = await this.getVariableValidations(variable.id);
      variable.validation_rules = validations;

      return handleQuerySuccess(variable);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async getByKey(key: string, organizationId: string): Promise<QueryResult<SystemVariable>> {
    try {
      const query = `
        SELECT 
          sv.*,
          -- Configuración incremental
          sic.id as inc_id,
          sic.prefix,
          sic.suffix,
          sic.current_number,
          sic.number_length,
          sic.reset_frequency,
          sic.last_reset_date,
          -- Valor actual
          svv.id as val_id,
          svv.text_value,
          svv.number_value,
          svv.date_value,
          svv.boolean_value,
          svv.updated_at as value_updated_at
        FROM system_variables sv
        LEFT JOIN system_variable_incremental_config sic ON sv.id = sic.system_variable_id
        LEFT JOIN system_variable_values svv ON sv.id = svv.system_variable_id
        WHERE sv.variable_key = @key AND sv.organization_id = @organizationId AND sv.is_active = 1
      `;

      const row = await executeQuerySingle<Record<string, unknown>>(query, { key, organizationId });
      
      if (!row) {
        return {
          success: false,
          error: 'Variable no encontrada'
        };
      }

      const variable = this.mapRowToVariable(row);
      
      // Obtener validaciones
      const validations = await this.getVariableValidations(variable.id);
      variable.validation_rules = validations;

      return handleQuerySuccess(variable);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async create(data: CreateVariableRequest, user: UserSession): Promise<QueryResult<SystemVariable>> {
    try {
      if (!user.currentOrganization) {
        return {
          success: false,
          error: 'No hay organización seleccionada'
        };
      }

      // Verificar permisos: Solo SYSTEM puede crear variables system_level_only
      const isSuperAdmin = user.roles?.includes('Super Admin') || false;
      const isSystemOrg = user.currentOrganization.name === 'SYSTEM';

      if (data.system_level_only && (!isSuperAdmin || !isSystemOrg)) {
        return {
          success: false,
          error: 'Solo Super Admin en organización SYSTEM puede crear variables de nivel sistema'
        };
      }

      const result = await executeTransaction(async (transaction) => {
        // 1. Crear la variable principal
        const insertVariableQuery = `
          INSERT INTO system_variables (
            organization_id, variable_key, display_name, variable_type, 
            description, category, group_id, is_editable, edit_permission, system_level_only,
            is_required, is_system, default_value, created_by_id, updated_by_id
          )
          OUTPUT INSERTED.id
          VALUES (
            @organizationId, @variableKey, @displayName, @variableType,
            @description, @category, @groupId, @isEditable, @editPermission, @systemLevelOnly,
            @isRequired, @isSystem, @defaultValue, @userId, @userId
          )
        `;

        const variableResult = await transaction.request()
          .input('organizationId', user.currentOrganization!.id)
          .input('variableKey', data.variable_key)
          .input('displayName', data.display_name)
          .input('variableType', data.variable_type)
          .input('description', data.description || null)
          .input('category', data.category || null)
          .input('groupId', data.group_id || null)
          .input('isEditable', data.is_editable || false)
          .input('editPermission', data.edit_permission || null)
          .input('systemLevelOnly', data.system_level_only || false)
          .input('isRequired', data.is_required || false)
          .input('isSystem', data.is_system || false)
          .input('defaultValue', data.default_value ? JSON.stringify(data.default_value) : null)
          .input('userId', user.id)
          .query(insertVariableQuery);

        const variableId = variableResult.recordset[0].id;

        // 2. Si es incremental, crear configuración
        if (data.variable_type === VariableType.INCREMENTAL && data.incremental_config) {
          const insertIncrementalQuery = `
            INSERT INTO system_variable_incremental_config (
              system_variable_id, prefix, suffix, current_number, 
              number_length, reset_frequency
            )
            VALUES (
              @variableId, @prefix, @suffix, @currentNumber,
              @numberLength, @resetFrequency
            )
          `;

          await transaction.request()
            .input('variableId', variableId)
            .input('prefix', data.incremental_config.prefix)
            .input('suffix', data.incremental_config.suffix || null)
            .input('currentNumber', data.incremental_config.current_number || 1)
            .input('numberLength', data.incremental_config.number_length || 8)
            .input('resetFrequency', data.incremental_config.reset_frequency || null)
            .query(insertIncrementalQuery);
        }

        // 3. Si tiene valor inicial, crearlo
        if (data.initial_value && data.variable_type !== VariableType.INCREMENTAL) {
          const insertValueQuery = `
            INSERT INTO system_variable_values (
              system_variable_id, text_value, number_value, 
              date_value, boolean_value, updated_by_id
            )
            VALUES (
              @variableId, @textValue, @numberValue,
              @dateValue, @booleanValue, @userId
            )
          `;

          await transaction.request()
            .input('variableId', variableId)
            .input('textValue', data.initial_value.text_value || null)
            .input('numberValue', data.initial_value.number_value || null)
            .input('dateValue', data.initial_value.date_value || null)
            .input('booleanValue', data.initial_value.boolean_value || null)
            .input('userId', user.id)
            .query(insertValueQuery);
        }

        // 4. Crear validaciones
        if (data.validation_rules && data.validation_rules.length > 0) {
          for (const validation of data.validation_rules) {
            const insertValidationQuery = `
              INSERT INTO system_variable_validations (
                system_variable_id, validation_type, validation_value, error_message
              )
              VALUES (
                @variableId, @validationType, @validationValue, @errorMessage
              )
            `;

            await transaction.request()
              .input('variableId', variableId)
              .input('validationType', validation.validation_type)
              .input('validationValue', validation.validation_value)
              .input('errorMessage', validation.error_message || null)
              .query(insertValidationQuery);
          }
        }

        // 5. Crear permiso automáticamente si es editable
        if (data.is_editable && data.edit_permission) {
          const insertPermissionQuery = `
            INSERT INTO permissions (
              name, description, category, organization_id, system_hidden, 
              active, created_at, updated_at, created_by_id, updated_by_id
            )
            VALUES (
              @permissionName, @permissionDescription, 'system_variables', @organizationId, 0,
              1, GETDATE(), GETDATE(), @userId, @userId
            )
          `;

          await transaction.request()
            .input('permissionName', data.edit_permission)
            .input('permissionDescription', `Editar configuración de ${data.display_name}`)
            .input('organizationId', user.currentOrganization!.id)
            .input('userId', user.id)
            .query(insertPermissionQuery);
        }

        // 6. Si es wizard de incremental con suffix, crear variable suffix
        let suffixVariableId = null;
        if (data.create_suffix_variable && data.suffix_variable_key && data.suffix_variable_name) {
          const insertSuffixQuery = `
            INSERT INTO system_variables (
              organization_id, variable_key, display_name, variable_type, 
              description, category, group_id, is_editable, edit_permission, system_level_only,
              is_required, is_system, default_value, created_by_id, updated_by_id
            )
            OUTPUT INSERTED.id
            VALUES (
              @organizationId, @variableKey, @displayName, 'text',
              @description, @category, @groupId, @isEditable, @editPermission, @systemLevelOnly,
              0, 0, '', @userId, @userId
            )
          `;

          const suffixResult = await transaction.request()
            .input('organizationId', user.currentOrganization!.id)
            .input('variableKey', data.suffix_variable_key)
            .input('displayName', data.suffix_variable_name)
            .input('description', `Sufijo para ${data.display_name}`)
            .input('category', data.category || null)
            .input('groupId', data.group_id || null)
            .input('isEditable', true)
            .input('editPermission', `system_variable:${data.suffix_variable_key}:edit`)
            .input('systemLevelOnly', data.system_level_only || false)
            .input('userId', user.id)
            .query(insertSuffixQuery);

          suffixVariableId = suffixResult.recordset[0].id;

          // Crear permiso para la variable suffix
          await transaction.request()
            .input('permissionName', `system_variable:${data.suffix_variable_key}:edit`)
            .input('permissionDescription', `Editar configuración de ${data.suffix_variable_name}`)
            .input('organizationId', user.currentOrganization!.id)
            .input('userId', user.id)
            .query(insertPermissionQuery);
        }

        // 7. Obtener la variable creada completa
        const result = await this.getById(variableId, user.currentOrganization!.id);
        
        if (result.success && result.data) {
          return result.data;
        } else {
          throw new Error('Error al obtener la variable creada');
        }
      });

      if (result) {
        return { success: true, data: result };
      } else {
        return { success: false, error: 'Error al crear la variable' };
      }
    } catch (error) {
      return handleQueryError(error);
    }
  }

  // =============================================
  // Métodos para generar números incrementales
  // =============================================

  static async generateNextNumber(
    organizationId: string,
    variableKey: string,
    userId: number,
    request: GenerateNumberRequest = {}
  ): Promise<QueryResult<GenerateNumberResponse>> {
    try {
      const result = await executeQuerySingle<{
        success: number;
        generated_code: string;
        number: number;
        error_message: string;
      }>('EXEC sp_GenerateNextNumber @organizationId, @variableKey, @userId, @context', {
        organizationId,
        variableKey,
        userId,
        context: request.context_info || null
      });

      if (!result) {
        return {
          success: false,
          error: 'Error al ejecutar procedimiento de generación'
        };
      }

      const response: GenerateNumberResponse = {
        success: Boolean(result.success),
        generated_code: result.generated_code || undefined,
        number: result.number || undefined,
        error_message: result.error_message || undefined
      };

      if (response.success) {
        return handleQuerySuccess(response);
      } else {
        return {
          success: false,
          error: response.error_message || 'Error desconocido al generar número'
        };
      }
    } catch (error) {
      return handleQueryError(error);
    }
  }

  // =============================================
  // Métodos para manejar valores
  // =============================================

  static async setValue(
    variableId: number,
    organizationId: string,
    data: SetVariableValueRequest,
    user: UserSession
  ): Promise<QueryResult<boolean>> {
    try {
      const result = await executeTransaction(async (transaction) => {
        // Verificar que la variable existe y pertenece a la organización
        const checkQuery = `
          SELECT id, variable_type 
          FROM system_variables 
          WHERE id = @variableId AND organization_id = @organizationId AND is_active = 1
        `;
        
        const variable = await transaction.request()
          .input('variableId', variableId)
          .input('organizationId', organizationId)
          .query(checkQuery);

        if (variable.recordset.length === 0) {
          throw new Error('Variable no encontrada');
        }

        const variableType = variable.recordset[0].variable_type;

        if (variableType === VariableType.INCREMENTAL) {
          throw new Error('No se puede establecer valor directo en variables incrementales');
        }

        // Obtener valor actual para log
        const currentValueQuery = `
          SELECT text_value, number_value, date_value, boolean_value
          FROM system_variable_values
          WHERE system_variable_id = @variableId
        `;

        const currentValue = await transaction.request()
          .input('variableId', variableId)
          .query(currentValueQuery);

        let oldValueStr = null;
        if (currentValue.recordset.length > 0) {
          const row = currentValue.recordset[0];
          oldValueStr = row.text_value || 
                       (row.number_value !== null ? String(row.number_value) : null) ||
                       (row.date_value ? row.date_value.toISOString() : null) ||
                       (row.boolean_value !== null ? String(row.boolean_value) : null);
        }

        // Upsert del valor
        const upsertQuery = `
          MERGE system_variable_values AS target
          USING (SELECT @variableId AS system_variable_id) AS source
          ON target.system_variable_id = source.system_variable_id
          WHEN MATCHED THEN
            UPDATE SET 
              text_value = @textValue,
              number_value = @numberValue,
              date_value = @dateValue,
              boolean_value = @booleanValue,
              updated_at = GETDATE(),
              updated_by_id = @userId
          WHEN NOT MATCHED THEN
            INSERT (system_variable_id, text_value, number_value, date_value, boolean_value, updated_by_id)
            VALUES (@variableId, @textValue, @numberValue, @dateValue, @booleanValue, @userId);
        `;

        await transaction.request()
          .input('variableId', variableId)
          .input('textValue', data.text_value || null)
          .input('numberValue', data.number_value || null)
          .input('dateValue', data.date_value || null)
          .input('booleanValue', data.boolean_value || null)
          .input('userId', user.id)
          .query(upsertQuery);

        // Registrar cambio en log
        const newValueStr = data.text_value || 
                           (data.number_value !== null ? String(data.number_value) : null) ||
                           data.date_value ||
                           (data.boolean_value !== null ? String(data.boolean_value) : null);

        const insertLogQuery = `
          INSERT INTO system_variable_change_log (
            system_variable_id, old_value, new_value, change_reason, changed_by_id
          )
          VALUES (
            @variableId, @oldValue, @newValue, @changeReason, @userId
          )
        `;

        await transaction.request()
          .input('variableId', variableId)
          .input('oldValue', oldValueStr)
          .input('newValue', newValueStr)
          .input('changeReason', data.change_reason || null)
          .input('userId', user.id)
          .query(insertLogQuery);

        // Actualizar timestamp de la variable principal
        const updateVariableQuery = `
          UPDATE system_variables 
          SET updated_at = GETDATE(), updated_by_id = @userId
          WHERE id = @variableId
        `;

        await transaction.request()
          .input('variableId', variableId)
          .input('userId', user.id)
          .query(updateVariableQuery);

        return true;
      });

      return { success: true, data: result };
    } catch (error) {
      return handleQueryError(error);
    }
  }

  // =============================================
  // Métodos auxiliares
  // =============================================

  private static mapRowToVariable(row: Record<string, unknown>): SystemVariable {
    const variable: SystemVariable = {
      id: Number(row.id),
      organization_id: String(row.organization_id),
      variable_key: String(row.variable_key),
      display_name: String(row.display_name),
      variable_type: row.variable_type as VariableType,
      description: row.description ? String(row.description) : undefined,
      category: row.category as VariableCategory,
      
      // Nuevos campos
      group_id: row.group_id ? Number(row.group_id) : undefined,
      is_editable: Boolean(row.is_editable),
      edit_permission: row.edit_permission ? String(row.edit_permission) : undefined,
      system_level_only: Boolean(row.system_level_only),
      
      // Campos existentes
      is_active: Boolean(row.is_active),
      is_required: Boolean(row.is_required),
      is_system: Boolean(row.is_system),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      created_by_id: Number(row.created_by_id),
      updated_by_id: Number(row.updated_by_id),
      
      // Campos de auditoría adicionales
      created_by_name: row.created_by_name ? String(row.created_by_name) : undefined,
      updated_by_name: row.updated_by_name ? String(row.updated_by_name) : undefined
    };

    // Mapear grupo si existe
    if (row.group_id) {
      variable.group = {
        id: Number(row.group_id),
        name: String(row.group_name),
        description: undefined,
        display_order: Number(row.group_order || 0),
        active: true,
        created_at: '',
        updated_at: '',
        created_by_id: 0,
        updated_by_id: 0
      };
    }

    // Mapear configuración incremental si existe
    if (row.inc_id) {
      variable.incremental_config = {
        id: Number(row.inc_id),
        system_variable_id: variable.id,
        prefix: String(row.prefix),
        suffix: row.suffix ? String(row.suffix) : undefined,
        current_number: Number(row.current_number),
        number_length: Number(row.number_length),
        reset_frequency: row.reset_frequency as ResetFrequency,
        last_reset_date: row.last_reset_date ? String(row.last_reset_date) : undefined
      };
    }

    // Mapear valor actual si existe
    if (row.val_id) {
      variable.current_value = {
        id: Number(row.val_id),
        system_variable_id: variable.id,
        text_value: row.text_value ? String(row.text_value) : undefined,
        number_value: row.number_value ? Number(row.number_value) : undefined,
        date_value: row.date_value ? String(row.date_value) : undefined,
        boolean_value: row.boolean_value !== null ? Boolean(row.boolean_value) : undefined,
        updated_at: String(row.value_updated_at),
        updated_by_id: Number(row.updated_by_id)
      };
    }

    return variable;
  }

  private static async getVariableValidations(variableId: number) {
    const query = `
      SELECT * FROM system_variable_validations 
      WHERE system_variable_id = @variableId
      ORDER BY validation_type
    `;

    const validations = await executeQuery<Record<string, unknown>>(query, { variableId });
    
    return validations.map(row => ({
      id: Number(row.id),
      system_variable_id: Number(row.system_variable_id),
      validation_type: row.validation_type as ValidationType,
      validation_value: String(row.validation_value),
      error_message: row.error_message ? String(row.error_message) : undefined
    }));
  }

  // =============================================
  // Métodos CRUD adicionales
  // =============================================

  static async updateVariable(
    id: number,
    organizationId: string,
    data: UpdateVariableRequest,
    user: UserSession
  ): Promise<QueryResult<SystemVariable>> {
    try {
      return await executeTransaction(async (transaction) => {
        // Verificar que la variable existe y pertenece a la organización
        const checkQuery = `
          SELECT id, variable_type, is_system 
          FROM system_variables 
          WHERE id = @id AND organization_id = @organizationId AND is_active = 1
        `;
        
        const existing = await transaction.request()
          .input('id', id)
          .input('organizationId', organizationId)
          .query(checkQuery);

        if (existing.recordset.length === 0) {
          throw new Error('Variable no encontrada');
        }

        // Las variables del sistema no pueden ser eliminadas (se valida en delete)

        // Actualizar variable principal solo con campos proporcionados
        const updateFields: string[] = [];
        const updateParams: Record<string, unknown> = {
          id,
          organizationId,
          userId: user.id
        };

        if (data.display_name !== undefined) {
          updateFields.push('display_name = @displayName');
          updateParams.displayName = data.display_name;
        }
        if (data.description !== undefined) {
          updateFields.push('description = @description');
          updateParams.description = data.description;
        }
        if (data.category !== undefined) {
          updateFields.push('category = @category');
          updateParams.category = data.category;
        }
        if (data.is_required !== undefined) {
          updateFields.push('is_required = @isRequired');
          updateParams.isRequired = data.is_required;
        }

        if (updateFields.length > 0) {
          updateFields.push('updated_at = GETDATE()', 'updated_by_id = @userId');
          
          const updateQuery = `
            UPDATE system_variables 
            SET ${updateFields.join(', ')}
            WHERE id = @id AND organization_id = @organizationId
          `;

          const request = transaction.request()
            .input('id', id)
            .input('organizationId', organizationId)
            .input('userId', user.id);
          
          Object.entries(updateParams).forEach(([key, value]) => {
            if (key !== 'id' && key !== 'organizationId' && key !== 'userId') {
              request.input(key, value);
            }
          });

          await request.query(updateQuery);
        }

        // Actualizar configuración incremental si se proporciona
        if (data.incremental_config) {
          const configUpsertQuery = `
            MERGE system_variable_incremental_config AS target
            USING (SELECT @variableId AS system_variable_id) AS source
            ON target.system_variable_id = source.system_variable_id
            WHEN MATCHED THEN
              UPDATE SET 
                prefix = @prefix,
                suffix = @suffix,
                number_length = @numberLength,
                current_number = @currentNumber,
                reset_frequency = @resetFrequency,
                updated_at = GETDATE()
            WHEN NOT MATCHED THEN
              INSERT (system_variable_id, prefix, suffix, number_length, current_number, reset_frequency)
              VALUES (@variableId, @prefix, @suffix, @numberLength, @currentNumber, @resetFrequency);
          `;

          await transaction.request()
            .input('variableId', id)
            .input('prefix', data.incremental_config.prefix || '')
            .input('suffix', data.incremental_config.suffix || '')
            .input('numberLength', data.incremental_config.number_length)
            .input('currentNumber', data.incremental_config.current_number)
            .input('resetFrequency', data.incremental_config.reset_frequency)
            .query(configUpsertQuery);
        }

        // Actualizar validaciones si se proporcionaron
        if (data.validation_rules !== undefined) {
          // Eliminar validaciones existentes
          await transaction.request()
            .input('variableId', id)
            .query('DELETE FROM system_variable_validations WHERE system_variable_id = @variableId');

          // Insertar nuevas validaciones
          if (data.validation_rules.length > 0) {
            for (const validation of data.validation_rules) {
              const insertValidationQuery = `
                INSERT INTO system_variable_validations 
                (system_variable_id, validation_type, validation_value, error_message)
                VALUES (@variableId, @validationType, @validationValue, @errorMessage)
              `;

              await transaction.request()
                .input('variableId', id)
                .input('validationType', validation.validation_type)
                .input('validationValue', validation.validation_value)
                .input('errorMessage', validation.error_message || null)
                .query(insertValidationQuery);
            }
          }
        }

        return { success: true };
      });

      // Devolver la variable actualizada
      const updatedVariable = await this.getById(id, organizationId);
      return updatedVariable;
    } catch (error) {
      return handleQueryError(error);
    }
  }

  static async deleteVariable(
    id: number,
    organizationId: string,
    user: UserSession
  ): Promise<QueryResult<boolean>> {
    try {
      const result = await executeTransaction(async (transaction) => {
        // Verificar que la variable existe y pertenece a la organización
        const checkQuery = `
          SELECT id, variable_key, is_system 
          FROM system_variables 
          WHERE id = @id AND organization_id = @organizationId AND is_active = 1
        `;
        
        const existing = await transaction.request()
          .input('id', id)
          .input('organizationId', organizationId)
          .query(checkQuery);

        if (existing.recordset.length === 0) {
          throw new Error('Variable no encontrada');
        }

        const variable = existing.recordset[0];

        // No permitir eliminar variables del sistema
        if (variable.is_system) {
          throw new Error('No se pueden eliminar variables del sistema');
        }

        // Soft delete de la variable
        const deleteQuery = `
          UPDATE system_variables 
          SET 
            is_active = 0,
            updated_at = GETDATE(),
            updated_by_id = @userId
          WHERE id = @id AND organization_id = @organizationId
        `;

        await transaction.request()
          .input('id', id)
          .input('organizationId', organizationId)
          .input('userId', user.id)
          .query(deleteQuery);

        // Registrar en log
        const logQuery = `
          INSERT INTO system_variable_change_log 
          (system_variable_id, change_type, old_value, new_value, changed_by_id, context)
          VALUES (@variableId, 'DELETE', NULL, NULL, @userId, @context)
        `;

        await transaction.request()
          .input('variableId', id)
          .input('userId', user.id)
          .input('context', `Variable ${variable.variable_key} eliminada`)
          .query(logQuery);

        return { success: true, data: true };
      });

      return result;
    } catch (error) {
      return handleQueryError(error);
    }
  }

  // =============================================
  // Métodos de validación
  // =============================================

  static async validateValue(
    organizationId: string,
    variableKey: string,
    value: unknown
  ): Promise<QueryResult<ValidationResult>> {
    try {
      const variableResult = await this.getByKey(variableKey, organizationId);
      
      if (!variableResult.success || !variableResult.data) {
        return {
          success: false,
          error: 'Variable no encontrada'
        };
      }

      const variable = variableResult.data;
      const errors: string[] = [];

      // Validar tipo de dato
      if (!this.validateDataType(variable.variable_type, value)) {
        errors.push(`Tipo de dato inválido para ${variable.variable_type}`);
      }

      // Validar reglas específicas
      if (variable.validation_rules) {
        for (const validation of variable.validation_rules) {
          const isValid = this.validateRule(validation, value);
          if (!isValid) {
            errors.push(validation.error_message || `Validación ${validation.validation_type} falló`);
          }
        }
      }

      const result: ValidationResult = {
        is_valid: errors.length === 0,
        errors
      };

      return handleQuerySuccess(result);
    } catch (error) {
      return handleQueryError(error);
    }
  }

  private static validateDataType(type: VariableType, value: unknown): boolean {
    switch (type) {
      case VariableType.TEXT:
        return typeof value === 'string';
      case VariableType.NUMBER:
        return typeof value === 'number' && !isNaN(value);
      case VariableType.BOOLEAN:
        return typeof value === 'boolean';
      case VariableType.DATE:
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case VariableType.JSON:
        return typeof value === 'object';
      default:
        return false;
    }
  }

  private static validateRule(validation: { validation_type: ValidationType; validation_value: string }, value: unknown): boolean {
    switch (validation.validation_type) {
      case ValidationType.MIN_VALUE:
        return typeof value === 'number' && value >= Number(validation.validation_value);
      case ValidationType.MAX_VALUE:
        return typeof value === 'number' && value <= Number(validation.validation_value);
      case ValidationType.MIN_LENGTH:
        return typeof value === 'string' && value.length >= Number(validation.validation_value);
      case ValidationType.MAX_LENGTH:
        return typeof value === 'string' && value.length <= Number(validation.validation_value);
      case ValidationType.REGEX:
        return typeof value === 'string' && new RegExp(validation.validation_value).test(value);
      case ValidationType.REQUIRED:
        return value !== null && value !== undefined && value !== '';
      default:
        return true;
    }
  }
}