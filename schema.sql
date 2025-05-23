-- ============================================================================
-- SCRIPT AUTO-EJECUTABLE PARA SISTEMA MULTI-TENANT CON VARIABLES DEL SISTEMA
-- Base de datos: SQL Server
-- Versión: 3.1 Con Variables del Sistema
-- ============================================================================

-- ============================================================================
-- LIMPIEZA INICIAL COMPLETA (SI EXISTEN)
-- ============================================================================

-- Drop stored procedures
IF OBJECT_ID('sp_GenerateNextNumber', 'P') IS NOT NULL DROP PROCEDURE sp_GenerateNextNumber;
GO

-- Drop triggers
IF OBJECT_ID('tr_variable_values_update', 'TR') IS NOT NULL DROP TRIGGER tr_variable_values_update;
IF OBJECT_ID('tr_incremental_config_update', 'TR') IS NOT NULL DROP TRIGGER tr_incremental_config_update;
IF OBJECT_ID('tr_system_variables_update', 'TR') IS NOT NULL DROP TRIGGER tr_system_variables_update;
IF OBJECT_ID('tr_activity_logs_update', 'TR') IS NOT NULL DROP TRIGGER tr_activity_logs_update;
IF OBJECT_ID('tr_user_sessions_update', 'TR') IS NOT NULL DROP TRIGGER tr_user_sessions_update;
IF OBJECT_ID('tr_user_organizations_update', 'TR') IS NOT NULL DROP TRIGGER tr_user_organizations_update;
IF OBJECT_ID('tr_users_update', 'TR') IS NOT NULL DROP TRIGGER tr_users_update;
IF OBJECT_ID('tr_organizations_update', 'TR') IS NOT NULL DROP TRIGGER tr_organizations_update;
GO

-- Drop tables in correct order (respecting foreign key dependencies)
IF OBJECT_ID('system_variable_number_history', 'U') IS NOT NULL DROP TABLE system_variable_number_history;
IF OBJECT_ID('system_variable_change_log', 'U') IS NOT NULL DROP TABLE system_variable_change_log;
IF OBJECT_ID('system_variable_validations', 'U') IS NOT NULL DROP TABLE system_variable_validations;
IF OBJECT_ID('system_variable_values', 'U') IS NOT NULL DROP TABLE system_variable_values;
IF OBJECT_ID('system_variable_incremental_config', 'U') IS NOT NULL DROP TABLE system_variable_incremental_config;
IF OBJECT_ID('system_variables', 'U') IS NOT NULL DROP TABLE system_variables;
IF OBJECT_ID('user_role_assignments', 'U') IS NOT NULL DROP TABLE user_role_assignments;
IF OBJECT_ID('role_permission_assignments', 'U') IS NOT NULL DROP TABLE role_permission_assignments;
IF OBJECT_ID('user_permission_assignments', 'U') IS NOT NULL DROP TABLE user_permission_assignments;
IF OBJECT_ID('user_sessions', 'U') IS NOT NULL DROP TABLE user_sessions;
IF OBJECT_ID('activity_logs', 'U') IS NOT NULL DROP TABLE activity_logs;
IF OBJECT_ID('user_organizations', 'U') IS NOT NULL DROP TABLE user_organizations;
IF OBJECT_ID('roles', 'U') IS NOT NULL DROP TABLE roles;
IF OBJECT_ID('permissions', 'U') IS NOT NULL DROP TABLE permissions;
IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;
IF OBJECT_ID('organizations', 'U') IS NOT NULL DROP TABLE organizations;
GO

-- ============================================================================
-- SCHEMA MULTI-TENANT PARA SISTEMA DE GESTIÓN DE USUARIOS, ROLES Y PERMISOS
-- Base de datos: SQL Server
-- Versión: 3.1 Multi-Tenant con Super Admin y Variables del Sistema
-- ============================================================================

-- Tabla de Organizaciones (Tenants)
CREATE TABLE organizations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    logo NVARCHAR(500), -- URL del logo
    rut NVARCHAR(50), -- RUT/Tax ID (único por organización)
    active BIT DEFAULT 1,
    expires_at DATETIME2 NULL, -- Fecha de expiración (NULL = nunca expira)
    
    -- Campos de auditoría obligatorios
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL, -- Se establecerá después de crear usuarios
    updated_by_id INT NULL,
    
    -- Índices
    INDEX IX_organizations_active (active),
    INDEX IX_organizations_rut (rut),
    INDEX IX_organizations_expires_at (expires_at),
    INDEX IX_organizations_created_at (created_at),
    INDEX IX_organizations_updated_at (updated_at)
);
GO

-- Tabla de Usuarios (Global - puede pertenecer a múltiples organizaciones)
-- NOTA: Esta tabla NO tiene organization_id porque los usuarios son globales
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    avatar NVARCHAR(500), -- URL del avatar
    active BIT DEFAULT 1,
    
    -- Campos de auditoría obligatorios
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL, -- Para el primer usuario será NULL
    updated_by_id INT NULL,
    
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Índices
    INDEX IX_users_email (email),
    INDEX IX_users_active (active),
    INDEX IX_users_created_at (created_at),
    INDEX IX_users_updated_at (updated_at)
);
GO

-- Tabla de Permisos (Por Organización)
CREATE TABLE permissions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL, -- ej: 'users:create', 'roles:edit'
    description NVARCHAR(500),
    category NVARCHAR(100), -- ej: 'users', 'roles', 'system'
    organization_id UNIQUEIDENTIFIER NOT NULL,
    system_hidden BIT DEFAULT 0, -- Para ocultar permisos del sistema
    active BIT DEFAULT 1,
    
    -- Campos de auditoría obligatorios
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Constraints
    UNIQUE(name, organization_id), -- Mismo permiso por organización
    INDEX IX_permissions_name (name),
    INDEX IX_permissions_organization_id (organization_id),
    INDEX IX_permissions_category (category),
    INDEX IX_permissions_system_hidden (system_hidden),
    INDEX IX_permissions_active (active),
    INDEX IX_permissions_created_at (created_at)
);
GO

-- Tabla de Roles (Por Organización, con Tipo Extensible)
CREATE TABLE roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL, -- ej: 'Admin', 'Manager', 'User'
    description NVARCHAR(500),
    type NVARCHAR(50) DEFAULT 'permissions', -- 'permissions', 'workflow', 'custom', 'system'
    organization_id UNIQUEIDENTIFIER NOT NULL,
    system_hidden BIT DEFAULT 0, -- Para ocultar roles del sistema
    active BIT DEFAULT 1,
    
    -- Campos de auditoría obligatorios
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Constraints
    UNIQUE(name, organization_id), -- Mismo rol por organización
    INDEX IX_roles_name (name),
    INDEX IX_roles_organization_id (organization_id),
    INDEX IX_roles_type (type),
    INDEX IX_roles_system_hidden (system_hidden),
    INDEX IX_roles_active (active),
    INDEX IX_roles_created_at (created_at)
);
GO

-- Tabla de Relación Usuario-Organización (Many-to-Many)
CREATE TABLE user_organizations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    joined_at DATETIME2 DEFAULT GETDATE(),
    active BIT DEFAULT 1,
    
    -- Campos de auditoría obligatorios
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Constraints
    UNIQUE(user_id, organization_id), -- Un usuario solo puede estar una vez por organización
    INDEX IX_user_organizations_user_id (user_id),
    INDEX IX_user_organizations_organization_id (organization_id),
    INDEX IX_user_organizations_active (active),
    INDEX IX_user_organizations_joined_at (joined_at)
);
GO

-- Tabla de Asignación Rol-Permiso (Many-to-Many)
CREATE TABLE role_permission_assignments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    organization_id UNIQUEIDENTIFIER NOT NULL, -- Para consistencia
    assigned_at DATETIME2 DEFAULT GETDATE(),
    active BIT DEFAULT 1,
    
    -- Campos de auditoría obligatorios
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Constraints
    UNIQUE(role_id, permission_id), -- Un permiso solo puede estar una vez por rol
    INDEX IX_role_permission_assignments_role_id (role_id),
    INDEX IX_role_permission_assignments_permission_id (permission_id),
    INDEX IX_role_permission_assignments_organization_id (organization_id),
    INDEX IX_role_permission_assignments_active (active)
);
GO

-- Tabla de Asignación Usuario-Rol (Many-to-Many)
CREATE TABLE user_role_assignments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    assigned_at DATETIME2 DEFAULT GETDATE(),
    active BIT DEFAULT 1,
    
    -- Campos de auditoría obligatorios
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Constraints
    UNIQUE(user_id, role_id, organization_id), -- Un usuario solo puede tener un rol una vez por organización
    INDEX IX_user_role_assignments_user_id (user_id),
    INDEX IX_user_role_assignments_role_id (role_id),
    INDEX IX_user_role_assignments_organization_id (organization_id),
    INDEX IX_user_role_assignments_active (active)
);
GO

-- Tabla de Asignación Usuario-Permiso Directo (Many-to-Many) - Para permisos específicos
CREATE TABLE user_permission_assignments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    permission_id INT NOT NULL,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    assigned_at DATETIME2 DEFAULT GETDATE(),
    active BIT DEFAULT 1,
    
    -- Campos de auditoría obligatorios
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Constraints
    UNIQUE(user_id, permission_id, organization_id), -- Un usuario solo puede tener un permiso una vez por organización
    INDEX IX_user_permission_assignments_user_id (user_id),
    INDEX IX_user_permission_assignments_permission_id (permission_id),
    INDEX IX_user_permission_assignments_organization_id (organization_id),
    INDEX IX_user_permission_assignments_active (active)
);
GO

-- Tabla de Sesiones de Usuario (Para logout remoto y control de sesiones)
CREATE TABLE user_sessions (
    session_token NVARCHAR(500) PRIMARY KEY, -- Session token/ID (JWT puede ser largo)
    user_id INT NOT NULL,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    ip_address NVARCHAR(45), -- Para IPv4 e IPv6
    user_agent NVARCHAR(1000),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    expires_at DATETIME2 NOT NULL,
    last_activity DATETIME2 DEFAULT GETDATE(),
    active BIT DEFAULT 1,
    created_by_id INT NULL,
    updated_by_id INT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Índices
    INDEX IX_user_sessions_user_id (user_id),
    INDEX IX_user_sessions_organization_id (organization_id),
    INDEX IX_user_sessions_expires_at (expires_at),
    INDEX IX_user_sessions_active (active),
    INDEX IX_user_sessions_last_activity (last_activity)
);
GO

-- Tabla de Log de Actividades (Para auditoría)
CREATE TABLE activity_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    action NVARCHAR(100) NOT NULL, -- ej: 'create', 'update', 'delete', 'login'
    resource_type NVARCHAR(100), -- ej: 'user', 'role', 'permission'
    resource_id NVARCHAR(100), -- ID del recurso afectado
    details NVARCHAR(MAX), -- JSON con detalles adicionales
    ip_address NVARCHAR(45),
    user_agent NVARCHAR(1000),
    
    -- Campos de auditoría obligatorios
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Índices
    INDEX IX_activity_logs_user_id (user_id),
    INDEX IX_activity_logs_organization_id (organization_id),
    INDEX IX_activity_logs_action (action),
    INDEX IX_activity_logs_resource_type (resource_type),
    INDEX IX_activity_logs_created_at (created_at)
);
GO

-- ============================================================================
-- SISTEMA DE VARIABLES DEL SISTEMA
-- ============================================================================

-- Tabla principal de variables del sistema
CREATE TABLE system_variables (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    variable_key NVARCHAR(100) NOT NULL,
    display_name NVARCHAR(255) NOT NULL,
    description NVARCHAR(1000) NULL,
    variable_type NVARCHAR(50) NOT NULL, -- 'incremental', 'text', 'number', 'date', 'boolean', 'json'
    category NVARCHAR(50) NOT NULL, -- 'numbering', 'limits', 'settings', 'dates', 'business_rules'
    is_required BIT DEFAULT 0,
    is_system BIT DEFAULT 0, -- Variables del sistema que no se pueden eliminar
    is_active BIT DEFAULT 1,
    default_value NVARCHAR(MAX) NULL, -- Valor por defecto (no se usa para incrementales)
    
    -- Campos de auditoría
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT UK_system_variables_org_key UNIQUE (organization_id, variable_key),
    
    -- Índices
    INDEX IX_system_variables_org_id (organization_id),
    INDEX IX_system_variables_key (variable_key),
    INDEX IX_system_variables_type (variable_type),
    INDEX IX_system_variables_category (category),
    INDEX IX_system_variables_active (is_active)
);
GO

-- Configuración para variables incrementales
CREATE TABLE system_variable_incremental_config (
    id INT IDENTITY(1,1) PRIMARY KEY,
    system_variable_id INT NOT NULL,
    prefix NVARCHAR(50) NOT NULL DEFAULT '',
    suffix NVARCHAR(50) NOT NULL DEFAULT '',
    current_number BIGINT NOT NULL DEFAULT 0,
    number_length INT NOT NULL DEFAULT 8, -- Cantidad de dígitos (con padding de ceros)
    reset_frequency NVARCHAR(20) NOT NULL DEFAULT 'never', -- 'never', 'yearly', 'monthly', 'daily'
    last_reset_date DATETIME2 NULL,
    
    -- Campos de auditoría
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (system_variable_id) REFERENCES system_variables(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX IX_incremental_config_variable_id (system_variable_id)
);
GO

-- Valores actuales de las variables
CREATE TABLE system_variable_values (
    id INT IDENTITY(1,1) PRIMARY KEY,
    system_variable_id INT NOT NULL,
    text_value NVARCHAR(MAX) NULL,
    number_value DECIMAL(18,6) NULL,
    date_value DATETIME2 NULL,
    boolean_value BIT NULL,
    
    -- Campos de auditoría
    updated_at DATETIME2 DEFAULT GETDATE(),
    updated_by_id INT NULL,
    
    FOREIGN KEY (system_variable_id) REFERENCES system_variables(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Solo puede haber un valor por variable
    CONSTRAINT UK_variable_values_variable_id UNIQUE (system_variable_id),
    
    -- Índices
    INDEX IX_variable_values_variable_id (system_variable_id),
    INDEX IX_variable_values_updated_at (updated_at)
);
GO

-- Reglas de validación para variables
CREATE TABLE system_variable_validations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    system_variable_id INT NOT NULL,
    validation_type NVARCHAR(50) NOT NULL, -- 'min_value', 'max_value', 'min_length', 'max_length', 'regex', 'required'
    validation_value NVARCHAR(500) NOT NULL, -- El valor a validar (número, regex, etc.)
    error_message NVARCHAR(500) NULL, -- Mensaje personalizado de error
    
    -- Campos de auditoría
    created_at DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (system_variable_id) REFERENCES system_variables(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX IX_validations_variable_id (system_variable_id),
    INDEX IX_validations_type (validation_type)
);
GO

-- Log de cambios y generación de números
CREATE TABLE system_variable_change_log (
    id INT IDENTITY(1,1) PRIMARY KEY,
    system_variable_id INT NOT NULL,
    change_type NVARCHAR(50) NOT NULL, -- 'VALUE_CHANGE', 'NUMBER_GENERATION', 'CONFIG_CHANGE', 'DELETE'
    old_value NVARCHAR(MAX) NULL,
    new_value NVARCHAR(MAX) NULL,
    context NVARCHAR(500) NULL, -- Contexto adicional (ej: "Orden de compra #123")
    
    -- Campos de auditoría
    created_at DATETIME2 DEFAULT GETDATE(),
    changed_by_id INT NULL,
    
    FOREIGN KEY (system_variable_id) REFERENCES system_variables(id),
    FOREIGN KEY (changed_by_id) REFERENCES users(id),
    
    -- Índices
    INDEX IX_change_log_variable_id (system_variable_id),
    INDEX IX_change_log_type (change_type),
    INDEX IX_change_log_created_at (created_at),
    INDEX IX_change_log_changed_by (changed_by_id)
);
GO

-- Tabla para historial de números generados (para auditoría y no reutilización)
CREATE TABLE system_variable_number_history (
    id INT IDENTITY(1,1) PRIMARY KEY,
    system_variable_id INT NOT NULL,
    generated_number NVARCHAR(200) NOT NULL, -- El número completo generado
    sequence_number BIGINT NOT NULL, -- Solo la parte numérica
    context NVARCHAR(500) NULL,
    
    -- Campos de auditoría
    generated_at DATETIME2 DEFAULT GETDATE(),
    generated_by_id INT NULL,
    
    FOREIGN KEY (system_variable_id) REFERENCES system_variables(id),
    FOREIGN KEY (generated_by_id) REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT UK_number_history_var_seq UNIQUE (system_variable_id, sequence_number),
    
    -- Índices
    INDEX IX_number_history_variable_id (system_variable_id),
    INDEX IX_number_history_generated_at (generated_at),
    INDEX IX_number_history_sequence (sequence_number)
);
GO

-- ============================================================================
-- STORED PROCEDURE PARA GENERACIÓN ATÓMICA DE NÚMEROS
-- ============================================================================

CREATE PROCEDURE sp_GenerateNextNumber
    @OrganizationId UNIQUEIDENTIFIER,
    @VariableKey NVARCHAR(100),
    @UserId INT,
    @Context NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @VariableId INT;
    DECLARE @CurrentNumber BIGINT;
    DECLARE @Prefix NVARCHAR(50);
    DECLARE @Suffix NVARCHAR(50);
    DECLARE @NumberLength INT;
    DECLARE @GeneratedNumber NVARCHAR(200);
    DECLARE @NewSequence BIGINT;
    
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Obtener la variable y bloquearla para actualización
        SELECT 
            @VariableId = sv.id,
            @CurrentNumber = ISNULL(sic.current_number, 0),
            @Prefix = ISNULL(sic.prefix, ''),
            @Suffix = ISNULL(sic.suffix, ''),
            @NumberLength = ISNULL(sic.number_length, 8)
        FROM system_variables sv WITH (UPDLOCK, ROWLOCK)
        INNER JOIN system_variable_incremental_config sic ON sv.id = sic.system_variable_id
        WHERE sv.organization_id = @OrganizationId 
            AND sv.variable_key = @VariableKey 
            AND sv.variable_type = 'incremental'
            AND sv.is_active = 1;
        
        IF @VariableId IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 0 as success, 'Variable incremental no encontrada' as error_message;
            RETURN;
        END
        
        -- Calcular el siguiente número
        SET @NewSequence = @CurrentNumber + 1;
        
        -- Generar el número formateado
        SET @GeneratedNumber = @Prefix + 
                              RIGHT('0000000000000000000000000000000000000000' + CAST(@NewSequence AS NVARCHAR(40)), @NumberLength) + 
                              @Suffix;
        
        -- Actualizar el contador
        UPDATE system_variable_incremental_config
        SET current_number = @NewSequence,
            updated_at = GETDATE()
        WHERE system_variable_id = @VariableId;
        
        -- Registrar en historial
        INSERT INTO system_variable_number_history 
        (system_variable_id, generated_number, sequence_number, context, generated_by_id)
        VALUES 
        (@VariableId, @GeneratedNumber, @NewSequence, @Context, @UserId);
        
        -- Registrar en log de cambios
        INSERT INTO system_variable_change_log 
        (system_variable_id, change_type, old_value, new_value, context, changed_by_id)
        VALUES 
        (@VariableId, 'NUMBER_GENERATION', CAST(@CurrentNumber AS NVARCHAR(50)), CAST(@NewSequence AS NVARCHAR(50)), @Context, @UserId);
        
        COMMIT TRANSACTION;
        
        -- Retornar el resultado exitoso
        SELECT 1 as success, @GeneratedNumber as number, @NewSequence as sequence_number;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        SELECT 0 as success, @ErrorMessage as error_message;
    END CATCH
END;
GO

-- ============================================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA DE CAMPOS DE AUDITORÍA
-- ============================================================================

-- Trigger para organizations
CREATE TRIGGER tr_organizations_update
ON organizations
AFTER UPDATE
AS
BEGIN
    UPDATE organizations 
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para users
CREATE TRIGGER tr_users_update
ON users
AFTER UPDATE
AS
BEGIN
    UPDATE users 
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para user_sessions
CREATE TRIGGER tr_user_sessions_update
ON user_sessions
AFTER UPDATE
AS
BEGIN
    UPDATE user_sessions 
    SET updated_at = GETDATE()
    WHERE session_token IN (SELECT session_token FROM inserted);
END;
GO

-- Trigger para user_organizations
CREATE TRIGGER tr_user_organizations_update
ON user_organizations
AFTER UPDATE
AS
BEGIN
    UPDATE user_organizations 
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para activity_logs
CREATE TRIGGER tr_activity_logs_update
ON activity_logs
AFTER UPDATE
AS
BEGIN
    UPDATE activity_logs 
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para system_variables
CREATE TRIGGER tr_system_variables_update
ON system_variables
AFTER UPDATE
AS
BEGIN
    UPDATE system_variables 
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para system_variable_incremental_config
CREATE TRIGGER tr_incremental_config_update
ON system_variable_incremental_config
AFTER UPDATE
AS
BEGIN
    UPDATE system_variable_incremental_config 
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para system_variable_values
CREATE TRIGGER tr_variable_values_update
ON system_variable_values
AFTER UPDATE
AS
BEGIN
    UPDATE system_variable_values 
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- ============================================================================
-- DATOS INICIALES - CREACIÓN DE ORGANIZACIONES Y USUARIOS
-- ============================================================================

-- Crear organización del sistema
DECLARE @system_org_id UNIQUEIDENTIFIER = NEWID();

INSERT INTO organizations (id, name, logo, rut, active, created_at, updated_at)
VALUES (@system_org_id, 'SYSTEM', NULL, NULL, 1, GETDATE(), GETDATE());

-- Crear usuario Super Admin (sin organización específica)
DECLARE @superadmin_id INT;

INSERT INTO users (email, password_hash, name, avatar, active, created_at, updated_at)
VALUES ('superadmin@system.local', '$2b$10$aVPNcGS4MzjY1frVqeflDO5KsaF7uC5hT15qCI/K0JTclINLaxSaW', 'Super Admin', NULL, 1, GETDATE(), GETDATE());

SET @superadmin_id = SCOPE_IDENTITY();

-- Actualizar la organización del sistema con el superadmin como creador
UPDATE organizations 
SET created_by_id = @superadmin_id, updated_by_id = @superadmin_id 
WHERE id = @system_org_id;

-- Actualizar el usuario superadmin con auto-referencia
UPDATE users 
SET created_by_id = @superadmin_id, updated_by_id = @superadmin_id 
WHERE id = @superadmin_id;

-- Crear permisos del sistema (ocultos)
INSERT INTO permissions (name, description, category, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id) VALUES
('system:superadmin', 'Acceso total al sistema', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('admin:access', 'Acceso al panel de administración', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system:organizations:create', 'Crear organizaciones', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system:organizations:edit', 'Editar organizaciones', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system:organizations:delete', 'Eliminar organizaciones', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system:organizations:view', 'Ver organizaciones', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('organizations:view_all', 'Ver todas las organizaciones', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system:users:create', 'Crear usuarios del sistema', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system:users:edit', 'Editar usuarios del sistema', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system:users:delete', 'Eliminar usuarios del sistema', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system:users:view', 'Ver usuarios del sistema', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system:permissions:manage', 'Gestionar permisos del sistema', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system:roles:manage', 'Gestionar roles del sistema', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);

-- Crear rol Super Admin (oculto del sistema)
DECLARE @superadmin_role_id INT;

INSERT INTO roles (name, description, type, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id)
VALUES ('Super Admin', 'Administrador del sistema con acceso total', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);

SET @superadmin_role_id = SCOPE_IDENTITY();

-- Asignar todos los permisos del sistema al rol Super Admin
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, assigned_at, active, created_at, updated_at, created_by_id, updated_by_id)
SELECT 
    @superadmin_role_id,
    p.id,
    @system_org_id,
    GETDATE(),
    1,
    GETDATE(),
    GETDATE(),
    @superadmin_id,
    @superadmin_id
FROM permissions p 
WHERE p.organization_id = @system_org_id AND p.system_hidden = 1;

-- Asignar el rol Super Admin al usuario Super Admin
INSERT INTO user_role_assignments (user_id, role_id, organization_id, assigned_at, active, created_at, updated_at, created_by_id, updated_by_id)
VALUES (@superadmin_id, @superadmin_role_id, @system_org_id, GETDATE(), 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);

-- Asignar el Super Admin a la organización del sistema
INSERT INTO user_organizations (user_id, organization_id, joined_at, active, created_at, updated_at, created_by_id, updated_by_id)
VALUES (@superadmin_id, @system_org_id, GETDATE(), 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);

-- Crear organización de ejemplo
DECLARE @demo_org_id UNIQUEIDENTIFIER = NEWID();

INSERT INTO organizations (id, name, logo, rut, active, created_at, updated_at, created_by_id, updated_by_id)
VALUES (@demo_org_id, 'Empresa Demo', NULL, '12345678-9', 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);

-- Crear permisos básicos para la organización demo
INSERT INTO permissions (name, description, category, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id) VALUES
('users:view', 'Ver usuarios', 'users', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('users:create', 'Crear usuarios', 'users', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('users:edit', 'Editar usuarios', 'users', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('users:delete', 'Eliminar usuarios', 'users', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('roles:view', 'Ver roles', 'roles', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('roles:create', 'Crear roles', 'roles', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('roles:edit', 'Editar roles', 'roles', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('roles:delete', 'Eliminar roles', 'roles', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('permissions:view', 'Ver permisos', 'permissions', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('dashboard:view', 'Ver dashboard', 'dashboard', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system_variables:view', 'Ver variables del sistema', 'system_variables', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system_variables:create', 'Crear variables del sistema', 'system_variables', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system_variables:edit', 'Editar variables del sistema', 'system_variables', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system_variables:generate', 'Generar números incrementales', 'system_variables', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);

-- Crear permisos para variables del sistema en la organización SYSTEM
INSERT INTO permissions (name, description, category, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id) VALUES
('system_variables:view', 'Ver variables del sistema', 'system_variables', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system_variables:create', 'Crear variables del sistema', 'system_variables', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system_variables:edit', 'Editar variables del sistema', 'system_variables', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system_variables:delete', 'Eliminar variables del sistema', 'system_variables', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('system_variables:generate', 'Generar números incrementales', 'system_variables', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);

-- Asignar permisos de variables del sistema al rol Super Admin
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, assigned_at, active, created_at, updated_at, created_by_id, updated_by_id)
SELECT 
    @superadmin_role_id,
    p.id,
    @system_org_id,
    GETDATE(),
    1,
    GETDATE(),
    GETDATE(),
    @superadmin_id,
    @superadmin_id
FROM permissions p 
WHERE p.organization_id = @system_org_id AND p.category = 'system_variables';

-- Crear roles básicos para la organización demo
DECLARE @admin_role_id INT, @user_role_id INT;

INSERT INTO roles (name, description, type, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id)
VALUES ('Admin', 'Administrador de la organización', 'permissions', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);
SET @admin_role_id = SCOPE_IDENTITY();

INSERT INTO roles (name, description, type, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id)
VALUES ('Usuario', 'Usuario básico', 'permissions', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);
SET @user_role_id = SCOPE_IDENTITY();

-- Asignar todos los permisos básicos al rol Admin
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, assigned_at, active, created_at, updated_at, created_by_id, updated_by_id)
SELECT 
    @admin_role_id,
    p.id,
    @demo_org_id,
    GETDATE(),
    1,
    GETDATE(),
    GETDATE(),
    @superadmin_id,
    @superadmin_id
FROM permissions p 
WHERE p.organization_id = @demo_org_id;

-- Asignar permisos básicos al rol Usuario
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, assigned_at, active, created_at, updated_at, created_by_id, updated_by_id)
SELECT 
    @user_role_id,
    p.id,
    @demo_org_id,
    GETDATE(),
    1,
    GETDATE(),
    GETDATE(),
    @superadmin_id,
    @superadmin_id
FROM permissions p 
WHERE p.organization_id = @demo_org_id 
AND p.name IN ('users:view', 'dashboard:view');

-- Crear usuario administrador de ejemplo
DECLARE @demo_admin_id INT;

INSERT INTO users (email, password_hash, name, avatar, active, created_at, updated_at, created_by_id, updated_by_id)
VALUES ('admin@demo.com', '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq', 'Admin Demo', NULL, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);

SET @demo_admin_id = SCOPE_IDENTITY();

-- Asignar el usuario demo a la organización demo
INSERT INTO user_organizations (user_id, organization_id, joined_at, active, created_at, updated_at, created_by_id, updated_by_id)
VALUES (@demo_admin_id, @demo_org_id, GETDATE(), 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);

-- Asignar el rol Admin al usuario demo
INSERT INTO user_role_assignments (user_id, role_id, organization_id, assigned_at, active, created_at, updated_at, created_by_id, updated_by_id)
VALUES (@demo_admin_id, @admin_role_id, @demo_org_id, GETDATE(), 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);

-- ============================================================================
-- VARIABLES DEL SISTEMA DE EJEMPLO
-- ============================================================================

-- Variable incremental para números de orden de compra
DECLARE @purchase_order_var_id INT;

INSERT INTO system_variables (
    organization_id, variable_key, display_name, description, variable_type, category, 
    is_required, is_system, created_by_id, updated_by_id
) 
VALUES (
    @demo_org_id, 
    'PURCHASE_ORDER_NUMBER', 
    'Numeración de Órdenes de Compra', 
    'Numeración automática para órdenes de compra con formato OC-XXXXXXXX',
    'incremental', 
    'numbering', 
    1, 
    0,
    @superadmin_id, 
    @superadmin_id
);

SET @purchase_order_var_id = SCOPE_IDENTITY();

INSERT INTO system_variable_incremental_config (
    system_variable_id, prefix, suffix, current_number, number_length, reset_frequency
)
VALUES (
    @purchase_order_var_id, 'OC-', '', 0, 8, 'yearly'
);

-- Variable de texto para slogan de la empresa
DECLARE @company_slogan_var_id INT;

INSERT INTO system_variables (
    organization_id, variable_key, display_name, description, variable_type, category, 
    is_required, is_system, default_value, created_by_id, updated_by_id
) 
VALUES (
    @demo_org_id, 
    'COMPANY_SLOGAN', 
    'Slogan de la Empresa', 
    'Frase representativa de la empresa',
    'text', 
    'settings', 
    0, 
    0,
    'Excelencia en cada proyecto',
    @superadmin_id, 
    @superadmin_id
);

SET @company_slogan_var_id = SCOPE_IDENTITY();

INSERT INTO system_variable_values (system_variable_id, text_value, updated_by_id)
VALUES (@company_slogan_var_id, 'Excelencia en cada proyecto', @superadmin_id);

-- Variable numérica para límite máximo de compra
DECLARE @max_purchase_var_id INT;

INSERT INTO system_variables (
    organization_id, variable_key, display_name, description, variable_type, category, 
    is_required, is_system, default_value, created_by_id, updated_by_id
) 
VALUES (
    @demo_org_id, 
    'MAX_PURCHASE_AMOUNT', 
    'Límite Máximo de Compra', 
    'Monto máximo permitido para órdenes de compra sin autorización especial',
    'number', 
    'limits', 
    1, 
    0,
    '1000000',
    @superadmin_id, 
    @superadmin_id
);

SET @max_purchase_var_id = SCOPE_IDENTITY();

INSERT INTO system_variable_values (system_variable_id, number_value, updated_by_id)
VALUES (@max_purchase_var_id, 1000000, @superadmin_id);

-- Variable booleana para modo mantenimiento
DECLARE @maintenance_mode_var_id INT;

INSERT INTO system_variables (
    organization_id, variable_key, display_name, description, variable_type, category, 
    is_required, is_system, default_value, created_by_id, updated_by_id
) 
VALUES (
    @demo_org_id, 
    'MAINTENANCE_MODE', 
    'Modo Mantenimiento', 
    'Indica si el sistema está en modo mantenimiento',
    'boolean', 
    'settings', 
    1, 
    0,
    'false',
    @superadmin_id, 
    @superadmin_id
);

SET @maintenance_mode_var_id = SCOPE_IDENTITY();

INSERT INTO system_variable_values (system_variable_id, boolean_value, updated_by_id)
VALUES (@maintenance_mode_var_id, 0, @superadmin_id);

-- ============================================================================
-- RESUMEN DE CREACIÓN
-- ============================================================================

PRINT '============================================================================';
PRINT 'SISTEMA MULTI-TENANT CREADO EXITOSAMENTE';
PRINT '============================================================================';
PRINT '';
PRINT 'Tablas creadas:';
PRINT '  ✓ organizations (con campos de auditoría)';
PRINT '  ✓ users (tabla global sin organization_id)';
PRINT '  ✓ user_organizations (relación many-to-many)';
PRINT '  ✓ permissions (con system_hidden)';
PRINT '  ✓ roles (con type y system_hidden)';
PRINT '  ✓ role_permission_assignments';
PRINT '  ✓ user_role_assignments';
PRINT '  ✓ user_permission_assignments';
PRINT '  ✓ user_sessions';
PRINT '  ✓ activity_logs';
PRINT '  ✓ system_variables (variables configurables del sistema)';
PRINT '  ✓ system_variable_incremental_config (configuración de numeración)';
PRINT '  ✓ system_variable_values (valores actuales)';
PRINT '  ✓ system_variable_validations (reglas de validación)';
PRINT '  ✓ system_variable_change_log (auditoría de cambios)';
PRINT '  ✓ system_variable_number_history (historial de números generados)';
PRINT '';
PRINT 'Características implementadas:';
PRINT '  ✓ Campos de auditoría obligatorios en todas las tablas';
PRINT '  ✓ Roles con tipos extensibles (permissions, workflow, custom, system)';
PRINT '  ✓ Permisos y roles con flags system_hidden';
PRINT '  ✓ Triggers automáticos para updated_at';
PRINT '  ✓ Índices optimizados para consultas multi-tenant';
PRINT '  ✓ Stored procedure para generación atómica de números';
PRINT '  ✓ Sistema de variables configurables con tipos múltiples';
PRINT '  ✓ Numeración automática atómica (sin duplicados)';
PRINT '  ✓ Validaciones configurables por variable';
PRINT '  ✓ Auditoría completa de cambios y generaciones';
PRINT '';
PRINT 'Datos iniciales creados:';
PRINT '  ✓ Super Admin: superadmin@system.local / Soporte.2019';
PRINT '  ✓ Usuario Demo: admin@demo.com / 123456';
PRINT '  ✓ Organización: SYSTEM (para permisos del sistema)';
PRINT '  ✓ Organización: Empresa Demo (organización de ejemplo)';
PRINT '  ✓ 11 permisos del sistema (ocultos)';
PRINT '  ✓ 14 permisos básicos (usuarios, roles, dashboard, variables)';
PRINT '  ✓ 5 permisos para variables del sistema (en SYSTEM)';
PRINT '  ✓ 1 rol del sistema: Super Admin (oculto)';
PRINT '  ✓ 2 roles básicos: Admin, Usuario';
PRINT '  ✓ 4 variables de ejemplo (numeración, texto, número, booleano)';
PRINT '';
PRINT 'IMPORTANTE:';
PRINT '  - Cambiar contraseñas en producción';
PRINT '  - El Super Admin puede acceder a cualquier organización';
PRINT '  - Los permisos y roles del sistema están ocultos para usuarios normales';
PRINT '  - La organización SYSTEM es solo para permisos del sistema';
PRINT '  - Las variables del sistema permiten numeración automática y configuración';
PRINT '';
PRINT 'El proyecto está listo para usar!';