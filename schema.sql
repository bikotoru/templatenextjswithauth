-- =====================================================
-- SCHEMA COMPLETO DEL SISTEMA NEXTJS TEMPLATE
-- =====================================================
-- Este script crea TODO el sistema desde cero
-- Incluye: tablas, permisos, roles, usuarios, triggers, datos iniciales
-- Se puede ejecutar múltiples veces sin problemas

-- Usar la base de datos


PRINT '🚀 Iniciando creación del schema completo...';
PRINT '';

-- =====================================================
-- 1. CREAR TABLAS PRINCIPALES
-- =====================================================

-- Tabla: organizations
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'organizations')
BEGIN
    CREATE TABLE organizations (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(255) NOT NULL,
        logo NVARCHAR(500),
        rut NVARCHAR(20),
        description NVARCHAR(1000),
        website NVARCHAR(500),
        phone NVARCHAR(50),
        email NVARCHAR(255),
        address NVARCHAR(1000),
        timezone NVARCHAR(100) DEFAULT 'America/Santiago',
        currency NVARCHAR(10) DEFAULT 'CLP',
        language NVARCHAR(10) DEFAULT 'es',
        expires_at DATETIME2 NULL,
        active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by_id INT NULL,
        updated_by_id INT NULL,
        
        INDEX IX_organizations_active (active),
        INDEX IX_organizations_created_at (created_at),
        INDEX IX_organizations_expires_at (expires_at),
        INDEX IX_organizations_name (name)
    );
    PRINT '✓ Tabla organizations creada';
END
ELSE
    PRINT '→ Tabla organizations ya existe';

-- Tabla: users (global, sin organization_id)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'users')
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(500) NOT NULL,
        name NVARCHAR(255) NOT NULL,
        avatar NVARCHAR(500),
        active BIT DEFAULT 1,
        last_login DATETIME2 NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by_id INT NULL,
        updated_by_id INT NULL,
        
        INDEX IX_users_email (email),
        INDEX IX_users_active (active),
        INDEX IX_users_created_at (created_at),
        INDEX IX_users_last_login (last_login)
    );
    PRINT '✓ Tabla users creada';
END
ELSE
BEGIN
    -- Agregar columna last_login si no existe
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'last_login')
    BEGIN
        ALTER TABLE users ADD last_login DATETIME2 NULL;
        CREATE NONCLUSTERED INDEX IX_users_last_login ON users (last_login);
        PRINT '✓ Columna last_login agregada a tabla users';
    END
    ELSE
        PRINT '→ Tabla users ya existe y tiene todas las columnas';
END

-- Tabla: user_organizations (relación many-to-many)
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' 
    AND TABLE_NAME = 'user_organizations'
)
BEGIN
    -- Crear la tabla
    CREATE TABLE dbo.user_organizations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        organization_id UNIQUEIDENTIFIER NOT NULL,
        active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by_id INT NOT NULL,
        updated_by_id INT NOT NULL,
        
        -- Foreign Keys
        CONSTRAINT FK_user_organizations_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT FK_user_organizations_organization_id 
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT FK_user_organizations_created_by_id 
            FOREIGN KEY (created_by_id) REFERENCES users(id),
        CONSTRAINT FK_user_organizations_updated_by_id 
            FOREIGN KEY (updated_by_id) REFERENCES users(id)
    );
    
    -- Crear índices por separado
    CREATE NONCLUSTERED INDEX IX_user_organizations_user_id 
        ON dbo.user_organizations (user_id);
    
    CREATE NONCLUSTERED INDEX IX_user_organizations_organization_id 
        ON dbo.user_organizations (organization_id);
    
    CREATE NONCLUSTERED INDEX IX_user_organizations_active 
        ON dbo.user_organizations (active);
    
    -- Crear índice único filtrado para registros activos
    CREATE UNIQUE NONCLUSTERED INDEX UQ_user_organizations_active 
        ON dbo.user_organizations (user_id, organization_id) 
        WHERE active = 1;
    
    PRINT '✓ Tabla user_organizations creada exitosamente';
END
ELSE
    PRINT '→ Tabla user_organizations ya existe';

-- Tabla: permissions
-- Verificar si la tabla existe (incluye esquema para mayor precisión)
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' 
    AND TABLE_NAME = 'permissions'
)
BEGIN
    -- Crear la tabla
    CREATE TABLE dbo.permissions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500),
        category NVARCHAR(50) DEFAULT 'general',
        system_hidden BIT DEFAULT 0,
        active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by_id INT NOT NULL,
        updated_by_id INT NOT NULL,
        
        -- Foreign Keys
        CONSTRAINT FK_permissions_created_by_id 
            FOREIGN KEY (created_by_id) REFERENCES users(id),
        CONSTRAINT FK_permissions_updated_by_id 
            FOREIGN KEY (updated_by_id) REFERENCES users(id)
    );
    
    -- Crear índices por separado
    CREATE NONCLUSTERED INDEX IX_permissions_name 
        ON dbo.permissions (name);
    
    CREATE NONCLUSTERED INDEX IX_permissions_category 
        ON dbo.permissions (category);
    
    CREATE NONCLUSTERED INDEX IX_permissions_active 
        ON dbo.permissions (active);
    
    CREATE NONCLUSTERED INDEX IX_permissions_system_hidden 
        ON dbo.permissions (system_hidden);
    
    -- Crear índice único filtrado para nombres activos
    CREATE UNIQUE NONCLUSTERED INDEX UQ_permissions_name_active 
        ON dbo.permissions (name) 
        WHERE active = 1;
    
    PRINT '✓ Tabla permissions creada exitosamente';
END
ELSE
    PRINT '→ Tabla permissions ya existe';

-- Tabla: roles
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'roles')
BEGIN
    CREATE TABLE roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500),
        type NVARCHAR(50) DEFAULT 'permissions',
        system_hidden BIT DEFAULT 0,
        organization_id UNIQUEIDENTIFIER NULL,
        active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by_id INT NOT NULL,
        updated_by_id INT NOT NULL,
        
        FOREIGN KEY (organization_id) REFERENCES organizations(id),
        FOREIGN KEY (created_by_id) REFERENCES users(id),
        FOREIGN KEY (updated_by_id) REFERENCES users(id),
        
        INDEX IX_roles_name (name),
        INDEX IX_roles_organization_id (organization_id),
        INDEX IX_roles_active (active),
        INDEX IX_roles_type (type),
        INDEX IX_roles_system_hidden (system_hidden)
    );
    PRINT '✓ Tabla roles creada';
END
ELSE
    PRINT '→ Tabla roles ya existe';

-- Tabla: role_permission_assignments
-- Verificar si la tabla existe (incluye esquema para mayor precisión)
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' 
    AND TABLE_NAME = 'role_permission_assignments'
)
BEGIN
    -- Crear la tabla
    CREATE TABLE dbo.role_permission_assignments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by_id INT NOT NULL,
        updated_by_id INT NOT NULL,
        
        -- Foreign Keys
        CONSTRAINT FK_role_permission_assignments_role_id 
            FOREIGN KEY (role_id) REFERENCES roles(id),
        CONSTRAINT FK_role_permission_assignments_permission_id 
            FOREIGN KEY (permission_id) REFERENCES permissions(id),
        CONSTRAINT FK_role_permission_assignments_created_by_id 
            FOREIGN KEY (created_by_id) REFERENCES users(id),
        CONSTRAINT FK_role_permission_assignments_updated_by_id 
            FOREIGN KEY (updated_by_id) REFERENCES users(id)
    );
    
    -- Crear índices por separado
    CREATE NONCLUSTERED INDEX IX_role_permission_assignments_role_id 
        ON dbo.role_permission_assignments (role_id);
    
    CREATE NONCLUSTERED INDEX IX_role_permission_assignments_permission_id 
        ON dbo.role_permission_assignments (permission_id);
    
    CREATE NONCLUSTERED INDEX IX_role_permission_assignments_active 
        ON dbo.role_permission_assignments (active);
    
    -- Crear índice único filtrado para asignaciones activas
    CREATE UNIQUE NONCLUSTERED INDEX UQ_role_permission_assignments_active 
        ON dbo.role_permission_assignments (role_id, permission_id) 
        WHERE active = 1;
    
    PRINT '✓ Tabla role_permission_assignments creada exitosamente';
END
ELSE
    PRINT '→ Tabla role_permission_assignments ya existe';

-- Tabla: user_role_assignments
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' 
    AND TABLE_NAME = 'user_role_assignments'
)
BEGIN
    CREATE TABLE dbo.user_role_assignments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        organization_id UNIQUEIDENTIFIER NULL,
        active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by_id INT NOT NULL,
        updated_by_id INT NOT NULL,
        
        -- Foreign Keys
        CONSTRAINT FK_user_role_assignments_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT FK_user_role_assignments_role_id 
            FOREIGN KEY (role_id) REFERENCES roles(id),
        CONSTRAINT FK_user_role_assignments_organization_id 
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT FK_user_role_assignments_created_by_id 
            FOREIGN KEY (created_by_id) REFERENCES users(id),
        CONSTRAINT FK_user_role_assignments_updated_by_id 
            FOREIGN KEY (updated_by_id) REFERENCES users(id)
    );
    
    -- Crear índices
    CREATE NONCLUSTERED INDEX IX_user_role_assignments_user_id 
        ON dbo.user_role_assignments (user_id);
    
    CREATE NONCLUSTERED INDEX IX_user_role_assignments_role_id 
        ON dbo.user_role_assignments (role_id);
    
    CREATE NONCLUSTERED INDEX IX_user_role_assignments_organization_id 
        ON dbo.user_role_assignments (organization_id);
    
    CREATE NONCLUSTERED INDEX IX_user_role_assignments_active 
        ON dbo.user_role_assignments (active);
    
    PRINT '✓ Tabla user_role_assignments creada exitosamente';
END
ELSE
    PRINT '→ Tabla user_role_assignments ya existe';

-- Tabla: user_permission_assignments
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' 
    AND TABLE_NAME = 'user_permission_assignments'
)
BEGIN
    CREATE TABLE dbo.user_permission_assignments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        permission_id INT NOT NULL,
        organization_id UNIQUEIDENTIFIER NOT NULL,
        active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by_id INT NOT NULL,
        updated_by_id INT NOT NULL,
        
        -- Foreign Keys
        CONSTRAINT FK_user_permission_assignments_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT FK_user_permission_assignments_permission_id 
            FOREIGN KEY (permission_id) REFERENCES permissions(id),
        CONSTRAINT FK_user_permission_assignments_organization_id 
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT FK_user_permission_assignments_created_by_id 
            FOREIGN KEY (created_by_id) REFERENCES users(id),
        CONSTRAINT FK_user_permission_assignments_updated_by_id 
            FOREIGN KEY (updated_by_id) REFERENCES users(id)
    );
    
    -- Crear índices
    CREATE NONCLUSTERED INDEX IX_user_permission_assignments_user_id 
        ON dbo.user_permission_assignments (user_id);
    
    CREATE NONCLUSTERED INDEX IX_user_permission_assignments_permission_id 
        ON dbo.user_permission_assignments (permission_id);
    
    CREATE NONCLUSTERED INDEX IX_user_permission_assignments_organization_id 
        ON dbo.user_permission_assignments (organization_id);
    
    CREATE NONCLUSTERED INDEX IX_user_permission_assignments_active 
        ON dbo.user_permission_assignments (active);
    
    -- Índice único filtrado para asignaciones activas
    CREATE UNIQUE NONCLUSTERED INDEX UQ_user_permission_assignments_active 
        ON dbo.user_permission_assignments (user_id, permission_id, organization_id) 
        WHERE active = 1;
    
    PRINT '✓ Tabla user_permission_assignments creada exitosamente';
END
ELSE
    PRINT '→ Tabla user_permission_assignments ya existe';

-- Tabla: user_sessions
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' 
    AND TABLE_NAME = 'user_sessions'
)
BEGIN
    CREATE TABLE dbo.user_sessions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        session_token NVARCHAR(500) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        organization_id UNIQUEIDENTIFIER NOT NULL,
        expires_at DATETIME2 NOT NULL,
        last_activity DATETIME2 DEFAULT GETDATE(),
        ip_address NVARCHAR(45),
        user_agent NVARCHAR(1000),
        active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by_id INT NOT NULL,
        updated_by_id INT NOT NULL,
        
        -- Foreign Keys
        CONSTRAINT FK_user_sessions_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT FK_user_sessions_organization_id 
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT FK_user_sessions_created_by_id 
            FOREIGN KEY (created_by_id) REFERENCES users(id),
        CONSTRAINT FK_user_sessions_updated_by_id 
            FOREIGN KEY (updated_by_id) REFERENCES users(id)
    );
    
    -- Crear índices
    CREATE NONCLUSTERED INDEX IX_user_sessions_session_token 
        ON dbo.user_sessions (session_token);
    
    CREATE NONCLUSTERED INDEX IX_user_sessions_user_id 
        ON dbo.user_sessions (user_id);
    
    CREATE NONCLUSTERED INDEX IX_user_sessions_expires_at 
        ON dbo.user_sessions (expires_at);
    
    CREATE NONCLUSTERED INDEX IX_user_sessions_active 
        ON dbo.user_sessions (active);
    
    PRINT '✓ Tabla user_sessions creada exitosamente';
END
ELSE
    PRINT '→ Tabla user_sessions ya existe';

-- Tabla: activity_logs
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' 
    AND TABLE_NAME = 'activity_logs'
)
BEGIN
    CREATE TABLE dbo.activity_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        organization_id UNIQUEIDENTIFIER NOT NULL,
        action NVARCHAR(100) NOT NULL,
        entity_type NVARCHAR(100),
        entity_id NVARCHAR(100),
        details NVARCHAR(MAX),
        ip_address NVARCHAR(45),
        user_agent NVARCHAR(1000),
        active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by_id INT NOT NULL,
        updated_by_id INT NOT NULL,
        
        -- Foreign Keys
        CONSTRAINT FK_activity_logs_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT FK_activity_logs_organization_id 
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT FK_activity_logs_created_by_id 
            FOREIGN KEY (created_by_id) REFERENCES users(id),
        CONSTRAINT FK_activity_logs_updated_by_id 
            FOREIGN KEY (updated_by_id) REFERENCES users(id)
    );
    
    -- Crear índices
    CREATE NONCLUSTERED INDEX IX_activity_logs_user_id 
        ON dbo.activity_logs (user_id);
    
    CREATE NONCLUSTERED INDEX IX_activity_logs_organization_id 
        ON dbo.activity_logs (organization_id);
    
    CREATE NONCLUSTERED INDEX IX_activity_logs_action 
        ON dbo.activity_logs (action);
    
    CREATE NONCLUSTERED INDEX IX_activity_logs_created_at 
        ON dbo.activity_logs (created_at);
    
    CREATE NONCLUSTERED INDEX IX_activity_logs_active 
        ON dbo.activity_logs (active);
    
    PRINT '✓ Tabla activity_logs creada exitosamente';
END
ELSE
    PRINT '→ Tabla activity_logs ya existe';

-- Tabla: theme_settings (Temas Corporativos)
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' 
    AND TABLE_NAME = 'theme_settings'
)
BEGIN
    CREATE TABLE dbo.theme_settings (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id UNIQUEIDENTIFIER NOT NULL,
        palette_key NVARCHAR(50) NOT NULL,
        is_active BIT DEFAULT 1,
        custom_logo_url NVARCHAR(500),
        custom_favicon_url NVARCHAR(500),
        active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by_id INT NOT NULL,
        updated_by_id INT NOT NULL,
        
        -- Foreign Keys
        CONSTRAINT FK_theme_settings_organization_id 
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT FK_theme_settings_created_by_id 
            FOREIGN KEY (created_by_id) REFERENCES users(id),
        CONSTRAINT FK_theme_settings_updated_by_id 
            FOREIGN KEY (updated_by_id) REFERENCES users(id)
    );
    
    -- Crear índices
    CREATE NONCLUSTERED INDEX IX_theme_settings_organization_id 
        ON dbo.theme_settings (organization_id);
    
    CREATE NONCLUSTERED INDEX IX_theme_settings_palette_key 
        ON dbo.theme_settings (palette_key);
    
    CREATE NONCLUSTERED INDEX IX_theme_settings_is_active 
        ON dbo.theme_settings (is_active);
    
    CREATE NONCLUSTERED INDEX IX_theme_settings_active 
        ON dbo.theme_settings (active);
    
    -- Índice único filtrado para organización activa
    CREATE UNIQUE NONCLUSTERED INDEX UQ_theme_settings_org_active 
        ON dbo.theme_settings (organization_id) 
        WHERE is_active = 1;
    
    PRINT '✓ Tabla theme_settings creada exitosamente';
END
ELSE
    PRINT '→ Tabla theme_settings ya existe';
DROP TABLE IF EXISTS dbo.system_variables;

-- Tabla: system_variables (Variables del Sistema)
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' 
    AND TABLE_NAME = 'system_variables'
)
BEGIN
    CREATE TABLE dbo.system_variables (
        id INT IDENTITY(1,1) PRIMARY KEY,
        [key] NVARCHAR(100) NOT NULL,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(1000),
        data_type NVARCHAR(50) NOT NULL, -- 'string', 'number', 'boolean', 'json'
        default_value NVARCHAR(MAX),
        config NVARCHAR(MAX), -- JSON con configuración adicional
        category NVARCHAR(100),
        is_required BIT DEFAULT 0,
        is_editable BIT DEFAULT 1,
        active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by INT NOT NULL,
        updated_by INT NOT NULL,
        
        -- Foreign Keys
        CONSTRAINT FK_system_variables_created_by 
            FOREIGN KEY (created_by) REFERENCES users(id),
        CONSTRAINT FK_system_variables_updated_by 
            FOREIGN KEY (updated_by) REFERENCES users(id)
    );
    
    -- Crear índices
    CREATE NONCLUSTERED INDEX IX_system_variables_key 
        ON dbo.system_variables ([key]);
    
    CREATE NONCLUSTERED INDEX IX_system_variables_category 
        ON dbo.system_variables (category);
    
    CREATE NONCLUSTERED INDEX IX_system_variables_active 
        ON dbo.system_variables (active);
    
    CREATE NONCLUSTERED INDEX IX_system_variables_is_required 
        ON dbo.system_variables (is_required);
    
    -- Índice único filtrado para key activas
    CREATE UNIQUE NONCLUSTERED INDEX UQ_system_variables_key_active 
        ON dbo.system_variables ([key]) 
        WHERE active = 1;
    
    PRINT '✓ Tabla system_variables creada exitosamente';
END
ELSE
    PRINT '→ Tabla system_variables ya existe';

-- Tabla: organization_variables (Valores por Organización)
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' 
    AND TABLE_NAME = 'organization_variables'
)
BEGIN
    CREATE TABLE dbo.organization_variables (
        id INT IDENTITY(1,1) PRIMARY KEY,
        organization_id UNIQUEIDENTIFIER NOT NULL,
        system_variable_id INT NOT NULL,
        value NVARCHAR(MAX),
        active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by INT NOT NULL,
        updated_by INT NOT NULL,
        
        -- Foreign Keys
        CONSTRAINT FK_organization_variables_organization_id 
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT FK_organization_variables_system_variable_id 
            FOREIGN KEY (system_variable_id) REFERENCES system_variables(id),
        CONSTRAINT FK_organization_variables_created_by 
            FOREIGN KEY (created_by) REFERENCES users(id),
        CONSTRAINT FK_organization_variables_updated_by 
            FOREIGN KEY (updated_by) REFERENCES users(id)
    );
    
    -- Crear índices
    CREATE NONCLUSTERED INDEX IX_org_vars_organization_id 
        ON dbo.organization_variables (organization_id);
    
    CREATE NONCLUSTERED INDEX IX_org_vars_system_variable_id 
        ON dbo.organization_variables (system_variable_id);
    
    CREATE NONCLUSTERED INDEX IX_org_vars_active 
        ON dbo.organization_variables (active);
    
    -- Índice único filtrado para combinación organización-variable activa
    CREATE UNIQUE NONCLUSTERED INDEX UQ_org_vars_active 
        ON dbo.organization_variables (organization_id, system_variable_id) 
        WHERE active = 1;
    
    PRINT '✓ Tabla organization_variables creada exitosamente';
END
ELSE
    PRINT '→ Tabla organization_variables ya existe';

PRINT '';
PRINT '📋 Tablas principales creadas/verificadas exitosamente';
-- =====================================================
-- 2. CREAR TRIGGERS PARA updated_at
-- =====================================================

-- Trigger para organizations
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_organizations_update')
BEGIN
    EXEC('CREATE TRIGGER tr_organizations_update ON organizations AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE organizations SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted); END');
    PRINT '✓ Trigger organizations created';
END

-- Trigger para users
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_users_update')
BEGIN
    EXEC('CREATE TRIGGER tr_users_update ON users AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE users SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted); END');
    PRINT '✓ Trigger users created';
END

-- Trigger para user_organizations
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_user_organizations_update')
BEGIN
    EXEC('CREATE TRIGGER tr_user_organizations_update ON user_organizations AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE user_organizations SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted); END');
    PRINT '✓ Trigger user_organizations created';
END

-- Trigger para permissions
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_permissions_update')
BEGIN
    EXEC('CREATE TRIGGER tr_permissions_update ON permissions AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE permissions SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted); END');
    PRINT '✓ Trigger permissions created';
END

-- Trigger para roles
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_roles_update')
BEGIN
    EXEC('CREATE TRIGGER tr_roles_update ON roles AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE roles SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted); END');
    PRINT '✓ Trigger roles created';
END

-- Trigger para theme_settings
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_theme_settings_update')
BEGIN
    EXEC('CREATE TRIGGER tr_theme_settings_update ON theme_settings AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE theme_settings SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted); END');
    PRINT '✓ Trigger theme_settings created';
END

-- Trigger para system_variables
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_system_variables_update')
BEGIN
    EXEC('CREATE TRIGGER tr_system_variables_update ON system_variables AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE system_variables SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted); END');
    PRINT '✓ Trigger system_variables created';
END

-- Trigger para organization_variables
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_organization_variables_update')
BEGIN
    EXEC('CREATE TRIGGER tr_organization_variables_update ON organization_variables AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE organization_variables SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted); END');
    PRINT '✓ Trigger organization_variables created';
END

PRINT '';
PRINT '⚡ Triggers creados/verificados';

-- =====================================================
-- 3. CREAR USUARIO SUPER ADMIN INICIAL
-- =====================================================

DECLARE @SuperAdminUserId INT = 1;

-- Crear usuario Super Admin si no existe
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'superadmin@system.local')
BEGIN
    SET IDENTITY_INSERT users ON;
    INSERT INTO users (id, email, password_hash, name, active, created_at, updated_at)
    VALUES (
        1, 
        'superadmin@system.local', 
        '$2a$10$CwTycUXWue0Thq9StjUM0uO8CfW7v8LnQM8JzUKqmfvJx.0LJGPle', -- 123456
        'Super Administrador',
        1,
        GETDATE(),
        GETDATE()
    );
    SET IDENTITY_INSERT users OFF;
    PRINT '✓ Usuario Super Admin creado (superadmin@system.local / 123456)';
END
ELSE
    PRINT '→ Usuario Super Admin ya existe';

-- Crear organización por defecto si no existe
DECLARE @DefaultOrgId UNIQUEIDENTIFIER = NEWID();
IF NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Organización por Defecto')
BEGIN
    INSERT INTO organizations (id, name, description, active, created_at, updated_at, created_by_id, updated_by_id)
    VALUES (
        @DefaultOrgId,
        'Organización por Defecto',
        'Organización inicial del sistema',
        1,
        GETDATE(),
        GETDATE(),
        @SuperAdminUserId,
        @SuperAdminUserId
    );
    PRINT '✓ Organización por defecto creada';
END
ELSE
BEGIN
    SELECT @DefaultOrgId = id FROM organizations WHERE name = 'Organización por Defecto';
    PRINT '→ Organización por defecto ya existe';
END

-- Asignar Super Admin a organización por defecto
IF NOT EXISTS (SELECT 1 FROM user_organizations WHERE user_id = @SuperAdminUserId AND organization_id = @DefaultOrgId)
BEGIN
    INSERT INTO user_organizations (user_id, organization_id, active, created_at, updated_at, created_by_id, updated_by_id)
    VALUES (@SuperAdminUserId, @DefaultOrgId, 1, GETDATE(), GETDATE(), @SuperAdminUserId, @SuperAdminUserId);
    PRINT '✓ Super Admin asignado a organización por defecto';
END
ELSE
    PRINT '→ Super Admin ya está asignado a organización por defecto';

PRINT '';
PRINT '👤 Usuario Super Admin configurado';

-- =====================================================
-- 4. CREAR PERMISOS DEL SISTEMA
-- =====================================================

-- Permisos básicos del sistema
DECLARE @Permissions TABLE (name NVARCHAR(100), description NVARCHAR(500), category NVARCHAR(50), system_hidden BIT);

INSERT INTO @Permissions VALUES
-- Dashboard
('dashboard:view', 'Ver dashboard principal', 'dashboard', 0),

-- Admin general
('admin:access', 'Acceso al panel de administración', 'admin', 0),

-- Users
('users:view', 'Ver usuarios', 'users', 0),
('users:create', 'Crear usuarios', 'users', 0),
('users:edit', 'Editar usuarios', 'users', 0),
('users:delete', 'Eliminar usuarios', 'users', 0),
('users:manage_roles', 'Gestionar roles de usuarios', 'users', 0),
('users:manage_permissions', 'Gestionar permisos directos de usuarios', 'users', 0),
('users:change_password', 'Cambiar contraseñas de usuarios', 'users', 0),

-- Roles
('roles:view', 'Ver roles', 'roles', 0),
('roles:create', 'Crear roles', 'roles', 0),
('roles:edit', 'Editar roles', 'roles', 0),
('roles:delete', 'Eliminar roles', 'roles', 0),
('roles:manage_permissions', 'Gestionar permisos de roles', 'roles', 0),

-- Permissions
('permissions:view', 'Ver permisos', 'permissions', 0),
('permissions:create', 'Crear permisos', 'permissions', 0),
('permissions:edit', 'Editar permisos', 'permissions', 0),
('permissions:delete', 'Eliminar permisos', 'permissions', 0),

-- Organizations
('organizations:view', 'Ver organizaciones propias', 'organizations', 0),
('organizations:view_all', 'Ver todas las organizaciones', 'organizations', 1),
('organizations:create', 'Crear organizaciones', 'organizations', 1),
('organizations:edit', 'Editar organizaciones', 'organizations', 1),
('organizations:delete', 'Eliminar organizaciones', 'organizations', 1),
('organizations:manage_users', 'Gestionar usuarios de organizaciones', 'organizations', 1),

-- System
('system:manage', 'Gestión completa del sistema', 'system', 1),
('system:logs', 'Ver logs del sistema', 'system', 1),
('system:backup', 'Realizar respaldos', 'system', 1),

-- Themes
('themes:view', 'Ver configuración de temas corporativos', 'themes', 0),
('themes:manage', 'Gestionar temas corporativos', 'themes', 0),

-- System Variables
('system_variables:view', 'Ver variables del sistema', 'system_variables', 1),
('system_variables:create', 'Crear variables del sistema', 'system_variables', 1),
('system_variables:edit', 'Editar variables del sistema', 'system_variables', 1),
('system_variables:delete', 'Eliminar variables del sistema', 'system_variables', 1),

-- Organization Variables
('org_variables:view', 'Ver variables de organización', 'org_variables', 0),
('org_variables:edit', 'Editar variables de organización', 'org_variables', 0),

-- Organization Settings
('org_settings:view', 'Ver configuración de organización', 'org_settings', 0),
('org_settings:edit', 'Editar configuración de organización', 'org_settings', 0);

-- Insertar permisos que no existen
INSERT INTO permissions (name, description, category, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id)
SELECT p.name, p.description, p.category, p.system_hidden, 1, GETDATE(), GETDATE(), @SuperAdminUserId, @SuperAdminUserId
FROM @Permissions p
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = p.name AND active = 1);

DECLARE @PermissionsCreated INT = @@ROWCOUNT;
IF @PermissionsCreated > 0
    PRINT '✓ ' + CAST(@PermissionsCreated AS VARCHAR(10)) + ' permisos creados';
ELSE
    PRINT '→ Todos los permisos ya existen';

PRINT '';
PRINT '🔑 Permisos del sistema configurados';

-- =====================================================
-- 5. CREAR ROLES DEL SISTEMA
-- =====================================================

-- Crear rol Super Admin (sistema, oculto)
DECLARE @SuperAdminRoleId INT;
IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Super Admin' AND type = 'system')
BEGIN
    INSERT INTO roles (name, description, type, system_hidden, organization_id, active, created_at, updated_at, created_by_id, updated_by_id)
    VALUES ('Super Admin', 'Administrador del sistema con acceso completo', 'system', 1, NULL, 1, GETDATE(), GETDATE(), @SuperAdminUserId, @SuperAdminUserId);
    SET @SuperAdminRoleId = SCOPE_IDENTITY();
    PRINT '✓ Rol Super Admin creado';
END
ELSE
BEGIN
    SELECT @SuperAdminRoleId = id FROM roles WHERE name = 'Super Admin' AND type = 'system' AND active = 1;
    PRINT '→ Rol Super Admin ya existe';
END

-- Asignar TODOS los permisos al Super Admin
INSERT INTO role_permission_assignments (role_id, permission_id, active, created_at, updated_at, created_by_id, updated_by_id)
SELECT @SuperAdminRoleId, p.id, 1, GETDATE(), GETDATE(), @SuperAdminUserId, @SuperAdminUserId
FROM permissions p
WHERE p.active = 1
AND NOT EXISTS (
    SELECT 1 FROM role_permission_assignments rpa 
    WHERE rpa.role_id = @SuperAdminRoleId 
    AND rpa.permission_id = p.id 
    AND rpa.active = 1
);

DECLARE @PermissionsAssigned INT = @@ROWCOUNT;
IF @PermissionsAssigned > 0
    PRINT '✓ ' + CAST(@PermissionsAssigned AS VARCHAR(10)) + ' permisos asignados a Super Admin';
ELSE
    PRINT '→ Super Admin ya tiene todos los permisos';

-- Asignar rol Super Admin al usuario Super Admin
IF NOT EXISTS (SELECT 1 FROM user_role_assignments WHERE user_id = @SuperAdminUserId AND role_id = @SuperAdminRoleId)
BEGIN
    INSERT INTO user_role_assignments (user_id, role_id, organization_id, active, created_at, updated_at, created_by_id, updated_by_id)
    VALUES (@SuperAdminUserId, @SuperAdminRoleId, NULL, 1, GETDATE(), GETDATE(), @SuperAdminUserId, @SuperAdminUserId);
    PRINT '✓ Rol Super Admin asignado al usuario Super Admin';
END
ELSE
    PRINT '→ Usuario Super Admin ya tiene el rol Super Admin';

-- Crear roles básicos por organización para la organización por defecto
DECLARE @BasicRoles TABLE (name NVARCHAR(100), description NVARCHAR(500), permissions NVARCHAR(MAX));

INSERT INTO @BasicRoles VALUES
('Admin', 'Administrador de organización', 'admin:access,users:view,users:create,users:edit,users:delete,users:manage_roles,roles:view,roles:create,roles:edit,permissions:view,organizations:view,themes:view,themes:manage,org_settings:view,org_settings:edit,org_variables:view,org_variables:edit'),
('Manager', 'Gestor con permisos limitados', 'users:view,users:edit,roles:view,permissions:view,organizations:view,themes:view,org_settings:view,org_variables:view'),
('User', 'Usuario básico', 'dashboard:view,organizations:view,themes:view,org_settings:view'),
('Viewer', 'Solo lectura', 'dashboard:view,organizations:view');

DECLARE @RoleName NVARCHAR(100), @RoleDescription NVARCHAR(500), @RolePermissions NVARCHAR(MAX);
DECLARE @RoleId INT;

DECLARE role_cursor CURSOR FOR 
SELECT name, description, permissions FROM @BasicRoles;

OPEN role_cursor;
FETCH NEXT FROM role_cursor INTO @RoleName, @RoleDescription, @RolePermissions;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Crear rol si no existe
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = @RoleName AND organization_id = @DefaultOrgId AND active = 1)
    BEGIN
        INSERT INTO roles (name, description, type, system_hidden, organization_id, active, created_at, updated_at, created_by_id, updated_by_id)
        VALUES (@RoleName, @RoleDescription, 'permissions', 0, @DefaultOrgId, 1, GETDATE(), GETDATE(), @SuperAdminUserId, @SuperAdminUserId);
        SET @RoleId = SCOPE_IDENTITY();
        
        -- Asignar permisos al rol
        INSERT INTO role_permission_assignments (role_id, permission_id, active, created_at, updated_at, created_by_id, updated_by_id)
        SELECT @RoleId, p.id, 1, GETDATE(), GETDATE(), @SuperAdminUserId, @SuperAdminUserId
        FROM permissions p
        WHERE p.name IN (SELECT TRIM(value) FROM STRING_SPLIT(@RolePermissions, ','))
        AND p.active = 1;
        
        PRINT '✓ Rol ' + @RoleName + ' creado con permisos';
    END
    ELSE
        PRINT '→ Rol ' + @RoleName + ' ya existe';
    
    FETCH NEXT FROM role_cursor INTO @RoleName, @RoleDescription, @RolePermissions;
END

CLOSE role_cursor;
DEALLOCATE role_cursor;

PRINT '';
PRINT '👥 Roles básicos configurados';

-- =====================================================
-- 6. CREAR VARIABLES DEL SISTEMA INICIALES
-- =====================================================

DECLARE @SystemVars TABLE (
    [key] NVARCHAR(100), 
    name NVARCHAR(255), 
    description NVARCHAR(1000), 
    data_type NVARCHAR(50), 
    default_value NVARCHAR(MAX), 
    category NVARCHAR(100),
    is_required BIT,
    is_editable BIT
);

INSERT INTO @SystemVars VALUES
-- Categoría: Configuración General
('org.max_users', 'Máximo de usuarios', 'Límite de usuarios para la organización', 'number', '100', 'Configuración General', 0, 1),
('org.allow_user_registration', 'Permitir registro de usuarios', 'Los usuarios pueden registrarse automáticamente', 'boolean', 'true', 'Configuración General', 0, 1),
('org.default_user_role', 'Rol por defecto', 'Rol asignado a nuevos usuarios', 'string', 'user', 'Configuración General', 0, 1),

-- Categoría: Notificaciones
('notifications.email_enabled', 'Notificaciones por email', 'Habilitar envío de emails', 'boolean', 'true', 'Notificaciones', 0, 1),
('notifications.sms_enabled', 'Notificaciones por SMS', 'Habilitar envío de SMS', 'boolean', 'false', 'Notificaciones', 0, 1),
('notifications.welcome_email', 'Email de bienvenida', 'Enviar email al crear usuario', 'boolean', 'true', 'Notificaciones', 0, 1),

-- Categoría: Seguridad
('security.password_min_length', 'Longitud mínima de contraseña', 'Caracteres mínimos para contraseñas', 'number', '8', 'Seguridad', 1, 1),
('security.password_require_uppercase', 'Requerir mayúsculas', 'Las contraseñas deben tener mayúsculas', 'boolean', 'true', 'Seguridad', 0, 1),
('security.session_timeout', 'Timeout de sesión (horas)', 'Horas antes de cerrar sesión automáticamente', 'number', '24', 'Seguridad', 0, 1),
('security.max_login_attempts', 'Intentos máximos de login', 'Intentos antes de bloquear cuenta', 'number', '5', 'Seguridad', 1, 1),

-- Categoría: Facturación
('billing.tax_rate', 'Tasa de impuesto (%)', 'Porcentaje de impuesto por defecto', 'number', '19', 'Facturación', 0, 1),
('billing.default_payment_terms', 'Términos de pago (días)', 'Días de plazo por defecto', 'number', '30', 'Facturación', 0, 1),
('billing.auto_invoice', 'Facturación automática', 'Generar facturas automáticamente', 'boolean', 'true', 'Facturación', 0, 1),

-- Variables del sistema (solo lectura)
('system.version', 'Versión del sistema', 'Versión actual del sistema', 'string', '1.0.0', 'Sistema', 1, 0),
('system.maintenance_mode', 'Modo mantenimiento', 'Sistema en modo mantenimiento', 'boolean', 'false', 'Sistema', 1, 1);

-- Insertar variables que no existen
INSERT INTO system_variables ([key], name, description, data_type, default_value, category, is_required, is_editable, active, created_at, updated_at, created_by, updated_by)
SELECT sv.[key], sv.name, sv.description, sv.data_type, sv.default_value, sv.category, sv.is_required, sv.is_editable, 1, GETDATE(), GETDATE(), @SuperAdminUserId, @SuperAdminUserId
FROM @SystemVars sv
WHERE NOT EXISTS (SELECT 1 FROM system_variables WHERE [key] = sv.[key] AND active = 1);

DECLARE @SystemVarsCreated INT = @@ROWCOUNT;
IF @SystemVarsCreated > 0
    PRINT '✓ ' + CAST(@SystemVarsCreated AS VARCHAR(10)) + ' variables del sistema creadas';
ELSE
    PRINT '→ Todas las variables del sistema ya existen';

-- Crear valores por defecto para la organización inicial
INSERT INTO organization_variables (organization_id, system_variable_id, value, active, created_at, updated_at, created_by, updated_by)
SELECT @DefaultOrgId, sv.id, sv.default_value, 1, GETDATE(), GETDATE(), @SuperAdminUserId, @SuperAdminUserId
FROM system_variables sv
WHERE sv.active = 1
AND NOT EXISTS (
    SELECT 1 FROM organization_variables ov 
    WHERE ov.organization_id = @DefaultOrgId 
    AND ov.system_variable_id = sv.id 
    AND ov.active = 1
);

DECLARE @OrgVarsCreated INT = @@ROWCOUNT;
IF @OrgVarsCreated > 0
    PRINT '✓ ' + CAST(@OrgVarsCreated AS VARCHAR(10)) + ' valores de variables creados para organización por defecto';
ELSE
    PRINT '→ Organización por defecto ya tiene todos los valores de variables';

PRINT '';
PRINT '⚙️ Variables del sistema configuradas';

-- =====================================================
-- 7. CONFIGURAR TEMAS CORPORATIVOS
-- =====================================================

-- Insertar configuración de tema por defecto para organizaciones existentes
INSERT INTO theme_settings (organization_id, palette_key, is_active, created_by_id, updated_by_id)
SELECT o.id, 'corporate_blue', 1, @SuperAdminUserId, @SuperAdminUserId
FROM organizations o
WHERE o.active = 1
AND NOT EXISTS (
    SELECT 1 FROM theme_settings ts 
    WHERE ts.organization_id = o.id 
    AND ts.active = 1
);

DECLARE @ThemeSettingsCreated INT = @@ROWCOUNT;
IF @ThemeSettingsCreated > 0
    PRINT '✓ ' + CAST(@ThemeSettingsCreated AS VARCHAR(10)) + ' configuraciones de tema creadas';
ELSE
    PRINT '→ Todas las organizaciones ya tienen configuración de tema';

PRINT '';
PRINT '🎨 Temas corporativos configurados';

-- =====================================================
-- 8. CREAR PROCEDIMIENTOS ALMACENADOS
-- =====================================================

-- Procedimiento para obtener permisos de usuario
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_get_user_permissions')
    DROP PROCEDURE sp_get_user_permissions;

EXEC('
CREATE PROCEDURE sp_get_user_permissions
    @user_id INT,
    @organization_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT DISTINCT p.name
    FROM permissions p
    WHERE p.active = 1
    AND p.id IN (
        -- Permisos directos
        SELECT up.permission_id 
        FROM user_permission_assignments up 
        WHERE up.user_id = @user_id 
        AND up.organization_id = @organization_id
        AND up.active = 1
        
        UNION
        
        -- Permisos por roles
        SELECT rp.permission_id 
        FROM role_permission_assignments rp
        INNER JOIN user_role_assignments ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = @user_id 
        AND (ur.organization_id = @organization_id OR ur.organization_id IS NULL)
        AND ur.active = 1
        AND rp.active = 1
    )
    ORDER BY p.name;
END
');

PRINT '✓ Procedimiento sp_get_user_permissions creado';

-- Procedimiento para verificar un permiso específico
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_check_user_permission')
    DROP PROCEDURE sp_check_user_permission;

EXEC('
CREATE PROCEDURE sp_check_user_permission
    @user_id INT,
    @permission_name NVARCHAR(100),
    @organization_id UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @has_permission BIT = 0;
    
    IF EXISTS (
        SELECT 1
        FROM permissions p
        WHERE p.name = @permission_name
        AND p.active = 1
        AND p.id IN (
            -- Permisos directos
            SELECT up.permission_id 
            FROM user_permission_assignments up 
            WHERE up.user_id = @user_id 
            AND (@organization_id IS NULL OR up.organization_id = @organization_id)
            AND up.active = 1
            
            UNION
            
            -- Permisos por roles
            SELECT rp.permission_id 
            FROM role_permission_assignments rp
            INNER JOIN user_role_assignments ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = @user_id 
            AND (@organization_id IS NULL OR ur.organization_id = @organization_id OR ur.organization_id IS NULL)
            AND ur.active = 1
            AND rp.active = 1
        )
    )
    SET @has_permission = 1;
    
    SELECT @has_permission as has_permission;
END
');

PRINT '✓ Procedimiento sp_check_user_permission creado';

PRINT '';
PRINT '📊 Procedimientos almacenados creados';

-- =====================================================
-- 9. ESTADÍSTICAS FINALES
-- =====================================================

DECLARE @TotalUsers INT, @TotalOrganizations INT, @TotalPermissions INT, @TotalRoles INT, @TotalThemes INT, @TotalSysVars INT;

SELECT @TotalUsers = COUNT(*) FROM users WHERE active = 1;
SELECT @TotalOrganizations = COUNT(*) FROM organizations WHERE active = 1;
SELECT @TotalPermissions = COUNT(*) FROM permissions WHERE active = 1;
SELECT @TotalRoles = COUNT(*) FROM roles WHERE active = 1;
SELECT @TotalThemes = COUNT(*) FROM theme_settings WHERE active = 1;
SELECT @TotalSysVars = COUNT(*) FROM system_variables WHERE active = 1;

PRINT '';
PRINT '=====================================================';
PRINT '           SISTEMA NEXTJS TEMPLATE INSTALADO';
PRINT '=====================================================';
PRINT 'Usuarios: ' + CAST(@TotalUsers AS VARCHAR(10));
PRINT 'Organizaciones: ' + CAST(@TotalOrganizations AS VARCHAR(10));
PRINT 'Permisos: ' + CAST(@TotalPermissions AS VARCHAR(10));
PRINT 'Roles: ' + CAST(@TotalRoles AS VARCHAR(10));
PRINT 'Configuraciones de tema: ' + CAST(@TotalThemes AS VARCHAR(10));
PRINT 'Variables del sistema: ' + CAST(@TotalSysVars AS VARCHAR(10));
PRINT '';
PRINT '🔐 CREDENCIALES INICIALES:';
PRINT '   Email: superadmin@system.local';
PRINT '   Password: 123456';
PRINT '';
PRINT '🌐 RUTAS PRINCIPALES:';
PRINT '   • /dashboard - Dashboard principal';
PRINT '   • /admin/personalizacion - Configuración organizacional';
PRINT '   • /admin/users - Gestión de usuarios (admin)';
PRINT '   • /admin/roles - Gestión de roles (admin)';
PRINT '   • /admin/permissions - Gestión de permisos (admin)';
PRINT '';
PRINT '✅ Sistema completamente configurado y listo para usar!';
PRINT '=====================================================';
GO