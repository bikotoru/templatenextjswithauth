-- ============================================================================
-- LIMPIEZA INICIAL DE TABLAS (SI EXISTEN)
-- ============================================================================

-- Drop tables in correct order (respecting foreign key dependencies)
IF OBJECT_ID('user_role_assignments', 'U') IS NOT NULL DROP TABLE user_role_assignments;
IF OBJECT_ID('role_permission_assignments', 'U') IS NOT NULL DROP TABLE role_permission_assignments;
IF OBJECT_ID('user_permission_assignments', 'U') IS NOT NULL DROP TABLE user_permission_assignments;
IF OBJECT_ID('user_sessions', 'U') IS NOT NULL DROP TABLE user_sessions;
IF OBJECT_ID('cv_processes', 'U') IS NOT NULL DROP TABLE cv_processes;
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
-- Versión: 2.0 Multi-Tenant
-- ============================================================================

-- Tabla de Organizaciones (Tenants)
CREATE TABLE organizations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    logo NVARCHAR(500), -- URL del logo
    rut NVARCHAR(50), -- RUT/Tax ID (único por organización)
    active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL, -- Se establecerá después de crear usuarios
    updated_by_id INT NULL,
    
    -- Índices
    INDEX IX_organizations_active (active),
    INDEX IX_organizations_rut (rut)
);
GO

-- Tabla de Usuarios (Global - puede pertenecer a múltiples organizaciones)
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    avatar NVARCHAR(500), -- URL del avatar
    active BIT DEFAULT 1,
    last_login DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL,
    
    -- Índices
    INDEX IX_users_email (email),
    INDEX IX_users_active (active)
);
GO

-- Tabla de Relación Usuario-Organización (Many-to-Many)
CREATE TABLE user_organizations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    is_org_admin BIT DEFAULT 0, -- Admin de la organización
    active BIT DEFAULT 1,
    joined_at DATETIME2 DEFAULT GETDATE(),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL,
    
    -- Índices
    INDEX IX_user_organizations_user_id (user_id),
    INDEX IX_user_organizations_organization_id (organization_id),
    INDEX IX_user_organizations_active (active),
    UNIQUE (user_id, organization_id),
    
    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id)
);
GO

-- Tabla de Permisos (Por Organización)
CREATE TABLE permissions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL,
    
    -- Índices
    INDEX IX_permissions_organization_id (organization_id),
    INDEX IX_permissions_name (name),
    INDEX IX_permissions_active (active),
    UNIQUE (organization_id, name),
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id)
);
GO

-- Tabla de Roles (Por Organización)
CREATE TABLE roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL,
    
    -- Índices
    INDEX IX_roles_organization_id (organization_id),
    INDEX IX_roles_name (name),
    INDEX IX_roles_active (active),
    UNIQUE (organization_id, name),
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id)
);
GO

-- Tabla de Relación Rol-Permisos (Many-to-Many, Por Organización)
CREATE TABLE role_permission_assignments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL,
    
    -- Índices
    INDEX IX_role_permissions_organization_id (organization_id),
    INDEX IX_role_permissions_role_id (role_id),
    INDEX IX_role_permissions_permission_id (permission_id),
    UNIQUE (organization_id, role_id, permission_id),
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id)
);
GO

-- Tabla de Relación Usuario-Roles (Many-to-Many, Por Organización)
CREATE TABLE user_role_assignments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at DATETIME2 DEFAULT GETDATE(),
    active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL,
    
    -- Índices
    INDEX IX_user_roles_organization_id (organization_id),
    INDEX IX_user_roles_user_id (user_id),
    INDEX IX_user_roles_role_id (role_id),
    UNIQUE (organization_id, user_id, role_id),
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id)
);
GO

-- Tabla de Permisos Directos de Usuario (Many-to-Many, Por Organización)
CREATE TABLE user_permission_assignments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    user_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL,
    
    -- Índices
    INDEX IX_user_permissions_organization_id (organization_id),
    INDEX IX_user_permissions_user_id (user_id),
    INDEX IX_user_permissions_permission_id (permission_id),
    UNIQUE (organization_id, user_id, permission_id),
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id)
);
GO

-- Tabla de Sesiones (Con Organización Activa)
CREATE TABLE user_sessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id UNIQUEIDENTIFIER NOT NULL, -- Organización activa en la sesión
    session_token NVARCHAR(500) NOT NULL UNIQUE,
    expires_at DATETIME2 NOT NULL,
    user_agent NVARCHAR(500),
    ip_address NVARCHAR(45),
    last_activity DATETIME2 DEFAULT GETDATE(),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL,
    
    -- Índices
    INDEX IX_user_sessions_user_id (user_id),
    INDEX IX_user_sessions_organization_id (organization_id),
    INDEX IX_user_sessions_token (session_token),
    INDEX IX_user_sessions_expires (expires_at),
    
    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id)
);
GO

-- Tabla de Procesos de CV (Por Organización)
CREATE TABLE cv_processes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) NOT NULL, -- pending, processing, completed, failed
    file_path NVARCHAR(500),
    processed_data NVARCHAR(MAX), -- JSON con datos procesados
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL,
    
    -- Índices
    INDEX IX_cv_processes_organization_id (organization_id),
    INDEX IX_cv_processes_status (status),
    INDEX IX_cv_processes_created_at (created_at),
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id)
);
GO

-- Tabla de Logs de Actividad (Por Organización)
CREATE TABLE activity_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    user_id INT NOT NULL,
    action NVARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, etc.
    entity_type NVARCHAR(50) NOT NULL, -- users, roles, permissions, etc.
    entity_id NVARCHAR(50), -- ID del registro afectado
    details NVARCHAR(MAX), -- JSON con detalles adicionales
    ip_address NVARCHAR(45),
    user_agent NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL,
    
    -- Índices
    INDEX IX_activity_logs_organization_id (organization_id),
    INDEX IX_activity_logs_user_id (user_id),
    INDEX IX_activity_logs_action (action),
    INDEX IX_activity_logs_entity_type (entity_type),
    INDEX IX_activity_logs_created_at (created_at),
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id)
);
GO

-- ============================================================================
-- AGREGAR FOREIGN KEYS A USERS Y ORGANIZATIONS (Después de crear todas las tablas)
-- ============================================================================

ALTER TABLE users ADD CONSTRAINT FK_users_created_by FOREIGN KEY (created_by_id) REFERENCES users(id);
ALTER TABLE users ADD CONSTRAINT FK_users_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id);
ALTER TABLE organizations ADD CONSTRAINT FK_organizations_created_by FOREIGN KEY (created_by_id) REFERENCES users(id);
ALTER TABLE organizations ADD CONSTRAINT FK_organizations_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id);
GO

-- ============================================================================
-- STORED PROCEDURES MULTI-TENANT
-- ============================================================================

-- Drop existing procedures if they exist
IF OBJECT_ID('sp_get_user_permissions', 'P') IS NOT NULL DROP PROCEDURE sp_get_user_permissions;
IF OBJECT_ID('sp_check_user_permission', 'P') IS NOT NULL DROP PROCEDURE sp_check_user_permission;
IF OBJECT_ID('sp_get_user_organizations', 'P') IS NOT NULL DROP PROCEDURE sp_get_user_organizations;
GO

-- Procedimiento para obtener permisos de un usuario en una organización
CREATE PROCEDURE sp_get_user_permissions
    @user_id INT,
    @organization_id UNIQUEIDENTIFIER
AS
BEGIN
    SELECT DISTINCT p.name, p.description
    FROM permissions p
    WHERE p.organization_id = @organization_id
    AND p.active = 1
    AND (
        -- Permisos directos del usuario
        p.id IN (
            SELECT up.permission_id 
            FROM user_permission_assignments up 
            WHERE up.user_id = @user_id 
            AND up.organization_id = @organization_id
        )
        OR
        -- Permisos heredados por roles
        p.id IN (
            SELECT rp.permission_id 
            FROM role_permission_assignments rp
            INNER JOIN user_role_assignments ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = @user_id 
            AND ur.organization_id = @organization_id
            AND rp.organization_id = @organization_id
            AND ur.active = 1
        )
    )
    ORDER BY p.name;
END;
GO

-- Procedimiento para validar si un usuario tiene un permiso específico en una organización
CREATE PROCEDURE sp_check_user_permission
    @user_id INT,
    @organization_id UNIQUEIDENTIFIER,
    @permission_name NVARCHAR(100)
AS
BEGIN
    DECLARE @has_permission BIT = 0;
    
    SELECT @has_permission = 1
    FROM permissions p
    WHERE p.organization_id = @organization_id
    AND p.name = @permission_name
    AND p.active = 1
    AND (
        -- Permiso directo del usuario
        p.id IN (
            SELECT up.permission_id 
            FROM user_permission_assignments up 
            WHERE up.user_id = @user_id 
            AND up.organization_id = @organization_id
        )
        OR
        -- Permiso heredado por roles
        p.id IN (
            SELECT rp.permission_id 
            FROM role_permission_assignments rp
            INNER JOIN user_role_assignments ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = @user_id 
            AND ur.organization_id = @organization_id
            AND rp.organization_id = @organization_id
            AND ur.active = 1
        )
    );
    
    SELECT @has_permission as has_permission;
END;
GO

-- Procedimiento para obtener organizaciones de un usuario
CREATE PROCEDURE sp_get_user_organizations
    @user_id INT
AS
BEGIN
    SELECT 
        o.id,
        o.name,
        o.logo,
        o.rut,
        uo.is_org_admin,
        uo.joined_at
    FROM organizations o
    INNER JOIN user_organizations uo ON o.id = uo.organization_id
    WHERE uo.user_id = @user_id
    AND o.active = 1
    AND uo.active = 1
    ORDER BY o.name;
END;
GO

-- ============================================================================
-- TRIGGERS PARA AUDIT AUTOMÁTICO
-- ============================================================================

-- Drop existing triggers if they exist
IF OBJECT_ID('tr_users_updated_at', 'TR') IS NOT NULL DROP TRIGGER tr_users_updated_at;
IF OBJECT_ID('tr_organizations_updated_at', 'TR') IS NOT NULL DROP TRIGGER tr_organizations_updated_at;
IF OBJECT_ID('tr_permissions_updated_at', 'TR') IS NOT NULL DROP TRIGGER tr_permissions_updated_at;
IF OBJECT_ID('tr_roles_updated_at', 'TR') IS NOT NULL DROP TRIGGER tr_roles_updated_at;
IF OBJECT_ID('tr_user_organizations_updated_at', 'TR') IS NOT NULL DROP TRIGGER tr_user_organizations_updated_at;
IF OBJECT_ID('tr_role_permissions_updated_at', 'TR') IS NOT NULL DROP TRIGGER tr_role_permissions_updated_at;
IF OBJECT_ID('tr_user_roles_updated_at', 'TR') IS NOT NULL DROP TRIGGER tr_user_roles_updated_at;
IF OBJECT_ID('tr_user_permissions_updated_at', 'TR') IS NOT NULL DROP TRIGGER tr_user_permissions_updated_at;
IF OBJECT_ID('tr_user_sessions_updated_at', 'TR') IS NOT NULL DROP TRIGGER tr_user_sessions_updated_at;
IF OBJECT_ID('tr_activity_logs_updated_at', 'TR') IS NOT NULL DROP TRIGGER tr_activity_logs_updated_at;
IF OBJECT_ID('tr_cv_processes_updated_at', 'TR') IS NOT NULL DROP TRIGGER tr_cv_processes_updated_at;
GO

-- Trigger para actualizar updated_at automáticamente en users
CREATE TRIGGER tr_users_updated_at ON users AFTER UPDATE AS
BEGIN
    UPDATE users SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para actualizar updated_at automáticamente en organizations
CREATE TRIGGER tr_organizations_updated_at ON organizations AFTER UPDATE AS
BEGIN
    UPDATE organizations SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para actualizar updated_at automáticamente en permissions
CREATE TRIGGER tr_permissions_updated_at ON permissions AFTER UPDATE AS
BEGIN
    UPDATE permissions SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para actualizar updated_at automáticamente en roles
CREATE TRIGGER tr_roles_updated_at ON roles AFTER UPDATE AS
BEGIN
    UPDATE roles SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para actualizar updated_at automáticamente en user_organizations
CREATE TRIGGER tr_user_organizations_updated_at ON user_organizations AFTER UPDATE AS
BEGIN
    UPDATE user_organizations SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para actualizar updated_at automáticamente en role_permission_assignments
CREATE TRIGGER tr_role_permissions_updated_at ON role_permission_assignments AFTER UPDATE AS
BEGIN
    UPDATE role_permission_assignments SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para actualizar updated_at automáticamente en user_role_assignments
CREATE TRIGGER tr_user_roles_updated_at ON user_role_assignments AFTER UPDATE AS
BEGIN
    UPDATE user_role_assignments SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para actualizar updated_at automáticamente en user_permission_assignments
CREATE TRIGGER tr_user_permissions_updated_at ON user_permission_assignments AFTER UPDATE AS
BEGIN
    UPDATE user_permission_assignments SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para actualizar updated_at automáticamente en user_sessions
CREATE TRIGGER tr_user_sessions_updated_at ON user_sessions AFTER UPDATE AS
BEGIN
    UPDATE user_sessions SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para actualizar updated_at automáticamente en activity_logs
CREATE TRIGGER tr_activity_logs_updated_at ON activity_logs AFTER UPDATE AS
BEGIN
    UPDATE activity_logs SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para actualizar updated_at automáticamente en cv_processes
CREATE TRIGGER tr_cv_processes_updated_at ON cv_processes AFTER UPDATE AS
BEGIN
    UPDATE cv_processes SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

-- ============================================================================
-- DATOS DE DEMOSTRACIÓN MULTI-TENANT
-- ============================================================================

-- Create sample organizations
DECLARE @org1_id UNIQUEIDENTIFIER = NEWID();
DECLARE @org2_id UNIQUEIDENTIFIER = NEWID();
DECLARE @org3_id UNIQUEIDENTIFIER = NEWID();

INSERT INTO organizations (id, name, logo, rut, active, created_at, updated_at) VALUES
(@org1_id, 'TechCorp Solutions', 'https://example.com/logos/techcorp.png', '96.123.456-7', 1, GETDATE(), GETDATE()),
(@org2_id, 'Consultores & Asociados', 'https://example.com/logos/consultores.png', '78.987.654-3', 1, GETDATE(), GETDATE()),
(@org3_id, 'InnovaStart', 'https://example.com/logos/innovastart.png', '85.555.777-2', 1, GETDATE(), GETDATE());

-- Create sample users
DECLARE @admin_id INT, @hr_manager_id INT, @hr_analyst_id INT, @recruiter_id INT;
DECLARE @consultant_id INT, @multiuser_id INT, @startup_founder_id INT, @viewer_id INT;

INSERT INTO users (name, email, password_hash, active, created_at, updated_at) VALUES
('Carlos Administrador', 'admin@techcorp.cl', '$2b$12$LQv3c1yqBwEHFh2cpTHMZu7/jIE8.5B5Q7RQcGKcpKLvs8oUhKvtu', 1, GETDATE(), GETDATE()),
('María García', 'maria.garcia@consultores.cl', '$2b$12$LQv3c1yqBwEHFh2cpTHMZu7/jIE8.5B5Q7RQcGKcpKLvs8oUhKvtu', 1, GETDATE(), GETDATE()),
('Ana Pérez', 'ana.perez@techcorp.cl', '$2b$12$LQv3c1yqBwEHFh2cpTHMZu7/jIE8.5B5Q7RQcGKcpKLvs8oUhKvtu', 1, GETDATE(), GETDATE()),
('Juan Reclutador', 'juan.recruiter@innovastart.cl', '$2b$12$LQv3c1yqBwEHFh2cpTHMZu7/jIE8.5B5Q7RQcGKcpKLvs8oUhKvtu', 1, GETDATE(), GETDATE()),
('Laura Consultora', 'laura.consultant@consultores.cl', '$2b$12$LQv3c1yqBwEHFh2cpTHMZu7/jIE8.5B5Q7RQcGKcpKLvs8oUhKvtu', 1, GETDATE(), GETDATE()),
('Pedro MultiOrg', 'multiuser@example.cl', '$2b$12$LQv3c1yqBwEHFh2cpTHMZu7/jIE8.5B5Q7RQcGKcpKLvs8oUhKvtu', 1, GETDATE(), GETDATE()),
('Sofia Fundadora', 'sofia@innovastart.cl', '$2b$12$LQv3c1yqBwEHFh2cpTHMZu7/jIE8.5B5Q7RQcGKcpKLvs8oUhKvtu', 1, GETDATE(), GETDATE()),
('Roberto Viewer', 'viewer@techcorp.cl', '$2b$12$LQv3c1yqBwEHFh2cpTHMZu7/jIE8.5B5Q7RQcGKcpKLvs8oUhKvtu', 1, GETDATE(), GETDATE());

-- Get user IDs
SELECT @admin_id = id FROM users WHERE email = 'admin@techcorp.cl';
SELECT @hr_manager_id = id FROM users WHERE email = 'maria.garcia@consultores.cl';
SELECT @hr_analyst_id = id FROM users WHERE email = 'ana.perez@techcorp.cl';
SELECT @recruiter_id = id FROM users WHERE email = 'juan.recruiter@innovastart.cl';
SELECT @consultant_id = id FROM users WHERE email = 'laura.consultant@consultores.cl';
SELECT @multiuser_id = id FROM users WHERE email = 'multiuser@example.cl';
SELECT @startup_founder_id = id FROM users WHERE email = 'sofia@innovastart.cl';
SELECT @viewer_id = id FROM users WHERE email = 'viewer@techcorp.cl';

-- Create permissions (same across all organizations)
DECLARE @perm_ids TABLE (name NVARCHAR(100), org_id UNIQUEIDENTIFIER, perm_id INT);

-- Insert permissions for each organization
WITH permission_names AS (
    SELECT 'users.view' as name, 'Ver usuarios' as description UNION ALL
    SELECT 'users.create', 'Crear usuarios' UNION ALL
    SELECT 'users.edit', 'Editar usuarios' UNION ALL
    SELECT 'users.delete', 'Eliminar usuarios' UNION ALL
    SELECT 'roles.view', 'Ver roles' UNION ALL
    SELECT 'roles.create', 'Crear roles' UNION ALL
    SELECT 'roles.edit', 'Editar roles' UNION ALL
    SELECT 'roles.delete', 'Eliminar roles' UNION ALL
    SELECT 'permissions.view', 'Ver permisos' UNION ALL
    SELECT 'permissions.assign', 'Asignar permisos' UNION ALL
    SELECT 'cv.view', 'Ver CVs' UNION ALL
    SELECT 'cv.upload', 'Subir CVs' UNION ALL
    SELECT 'cv.process', 'Procesar CVs' UNION ALL
    SELECT 'cv.download', 'Descargar CVs' UNION ALL
    SELECT 'cv.delete', 'Eliminar CVs' UNION ALL
    SELECT 'reports.view', 'Ver reportes' UNION ALL
    SELECT 'reports.export', 'Exportar reportes' UNION ALL
    SELECT 'settings.view', 'Ver configuración' UNION ALL
    SELECT 'settings.edit', 'Editar configuración' UNION ALL
    SELECT 'audit.view', 'Ver auditoría'
),
orgs AS (
    SELECT @org1_id as org_id UNION ALL
    SELECT @org2_id UNION ALL
    SELECT @org3_id
)
INSERT INTO permissions (name, description, organization_id, created_at, updated_at, created_by_id, updated_by_id)
OUTPUT inserted.name, inserted.organization_id, inserted.id INTO @perm_ids
SELECT 
    p.name,
    p.description,
    o.org_id,
    GETDATE(),
    GETDATE(),
    @admin_id,
    @admin_id
FROM permission_names p
CROSS JOIN orgs o;

-- Create roles for each organization
DECLARE @role_ids TABLE (name NVARCHAR(100), org_id UNIQUEIDENTIFIER, role_id INT);

WITH role_names AS (
    SELECT 'Super Admin' as name, 'Administrador con acceso completo al sistema' as description UNION ALL
    SELECT 'HR Manager', 'Gerente de RRHH con permisos de gestión' UNION ALL
    SELECT 'HR Analyst', 'Analista de RRHH con permisos limitados' UNION ALL
    SELECT 'Recruiter', 'Reclutador con acceso a CVs' UNION ALL
    SELECT 'Viewer', 'Solo visualización de información básica'
),
orgs AS (
    SELECT @org1_id as org_id UNION ALL
    SELECT @org2_id UNION ALL
    SELECT @org3_id
)
INSERT INTO roles (name, description, organization_id, created_at, updated_at, created_by_id, updated_by_id)
OUTPUT inserted.name, inserted.organization_id, inserted.id INTO @role_ids
SELECT 
    r.name,
    r.description,
    o.org_id,
    GETDATE(),
    GETDATE(),
    @admin_id,
    @admin_id
FROM role_names r
CROSS JOIN orgs o;

-- Assign permissions to roles
-- Super Admin: All permissions
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, created_at, created_by_id)
SELECT r.role_id, p.perm_id, r.org_id, GETDATE(), @admin_id
FROM @role_ids r
JOIN @perm_ids p ON r.org_id = p.org_id
WHERE r.name = 'Super Admin';

-- HR Manager: Most permissions except system settings
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, created_at, created_by_id)
SELECT r.role_id, p.perm_id, r.org_id, GETDATE(), @admin_id
FROM @role_ids r
JOIN @perm_ids p ON r.org_id = p.org_id
WHERE r.name = 'HR Manager' 
AND p.name NOT IN ('settings.edit', 'users.delete', 'roles.delete');

-- HR Analyst: View and basic CV operations
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, created_at, created_by_id)
SELECT r.role_id, p.perm_id, r.org_id, GETDATE(), @admin_id
FROM @role_ids r
JOIN @perm_ids p ON r.org_id = p.org_id
WHERE r.name = 'HR Analyst' 
AND p.name IN ('users.view', 'cv.view', 'cv.upload', 'cv.process', 'cv.download', 'reports.view');

-- Recruiter: CV focused permissions
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, created_at, created_by_id)
SELECT r.role_id, p.perm_id, r.org_id, GETDATE(), @admin_id
FROM @role_ids r
JOIN @perm_ids p ON r.org_id = p.org_id
WHERE r.name = 'Recruiter' 
AND p.name IN ('cv.view', 'cv.upload', 'cv.process', 'cv.download', 'reports.view');

-- Viewer: Only view permissions
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, created_at, created_by_id)
SELECT r.role_id, p.perm_id, r.org_id, GETDATE(), @admin_id
FROM @role_ids r
JOIN @perm_ids p ON r.org_id = p.org_id
WHERE r.name = 'Viewer' 
AND p.name IN ('users.view', 'cv.view', 'reports.view');

-- Assign users to organizations
INSERT INTO user_organizations (user_id, organization_id, joined_at, active, created_at, updated_at) VALUES
-- Single organization users
(@admin_id, @org1_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@hr_manager_id, @org2_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@hr_analyst_id, @org1_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@recruiter_id, @org3_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@consultant_id, @org2_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@startup_founder_id, @org3_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@viewer_id, @org1_id, GETDATE(), 1, GETDATE(), GETDATE()),

-- Multi-organization user (Pedro MultiOrg) - belongs to all three organizations
(@multiuser_id, @org1_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@multiuser_id, @org2_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@multiuser_id, @org3_id, GETDATE(), 1, GETDATE(), GETDATE());

-- Assign roles to users (this is where the multi-tenant magic happens!)
INSERT INTO user_role_assignments (user_id, role_id, organization_id, assigned_at, active, created_at, updated_at, created_by_id) VALUES

-- TechCorp Solutions (@org1_id)
(@admin_id, (SELECT role_id FROM @role_ids WHERE name = 'Super Admin' AND org_id = @org1_id), @org1_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),
(@hr_analyst_id, (SELECT role_id FROM @role_ids WHERE name = 'HR Analyst' AND org_id = @org1_id), @org1_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),
(@viewer_id, (SELECT role_id FROM @role_ids WHERE name = 'Viewer' AND org_id = @org1_id), @org1_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),

-- Consultores & Asociados (@org2_id)
(@hr_manager_id, (SELECT role_id FROM @role_ids WHERE name = 'HR Manager' AND org_id = @org2_id), @org2_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),
(@consultant_id, (SELECT role_id FROM @role_ids WHERE name = 'HR Analyst' AND org_id = @org2_id), @org2_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),

-- InnovaStart (@org3_id)
(@startup_founder_id, (SELECT role_id FROM @role_ids WHERE name = 'Super Admin' AND org_id = @org3_id), @org3_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),
(@recruiter_id, (SELECT role_id FROM @role_ids WHERE name = 'Recruiter' AND org_id = @org3_id), @org3_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),

-- MULTI-TENANT USER ROLES - Pedro MultiOrg has different roles in each organization!
-- In TechCorp: He's just a Viewer (lowest permissions)
(@multiuser_id, (SELECT role_id FROM @role_ids WHERE name = 'Viewer' AND org_id = @org1_id), @org1_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),
-- In Consultores: He's an HR Manager (high permissions)
(@multiuser_id, (SELECT role_id FROM @role_ids WHERE name = 'HR Manager' AND org_id = @org2_id), @org2_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),
-- In InnovaStart: He's a Super Admin (full permissions)
(@multiuser_id, (SELECT role_id FROM @role_ids WHERE name = 'Super Admin' AND org_id = @org3_id), @org3_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id);

-- Create sample CV processes for each organization
INSERT INTO cv_processes (name, status, file_path, processed_data, organization_id, created_at, updated_at, created_by_id, updated_by_id) VALUES
-- TechCorp processes
('CV_Juan_Desarrollador.pdf', 'completed', '/uploads/org1/cv_juan_dev.pdf', '{"name":"Juan Desarrollador","skills":["JavaScript","React","Node.js"],"experience":3}', @org1_id, GETDATE(), GETDATE(), @admin_id, @admin_id),
('CV_Maria_Designer.pdf', 'processing', '/uploads/org1/cv_maria_design.pdf', NULL, @org1_id, GETDATE(), GETDATE(), @hr_analyst_id, @hr_analyst_id),

-- Consultores processes
('CV_Carlos_Consultor.pdf', 'completed', '/uploads/org2/cv_carlos_cons.pdf', '{"name":"Carlos Consultor","skills":["Strategy","Management","SAP"],"experience":8}', @org2_id, GETDATE(), GETDATE(), @hr_manager_id, @hr_manager_id),
('CV_Ana_Analista.pdf', 'pending', '/uploads/org2/cv_ana_analyst.pdf', NULL, @org2_id, GETDATE(), GETDATE(), @consultant_id, @consultant_id),

-- InnovaStart processes
('CV_Pedro_Startup.pdf', 'completed', '/uploads/org3/cv_pedro_startup.pdf', '{"name":"Pedro Startup","skills":["Python","AI","Entrepreneurship"],"experience":2}', @org3_id, GETDATE(), GETDATE(), @startup_founder_id, @startup_founder_id),
('CV_Laura_Marketing.pdf', 'failed', '/uploads/org3/cv_laura_mkt.pdf', NULL, @org3_id, GETDATE(), GETDATE(), @recruiter_id, @recruiter_id);

-- Create active sessions (showing current organization context)
INSERT INTO user_sessions (user_id, organization_id, session_token, expires_at, created_at, last_activity) VALUES
(@admin_id, @org1_id, 'session_token_admin_tech', DATEADD(hour, 24, GETDATE()), GETDATE(), GETDATE()),
(@hr_manager_id, @org2_id, 'session_token_manager_cons', DATEADD(hour, 24, GETDATE()), GETDATE(), GETDATE()),
(@multiuser_id, @org2_id, 'session_token_multi_cons', DATEADD(hour, 24, GETDATE()), GETDATE(), GETDATE()); -- Multi user currently active in Consultores

PRINT 'Demo data created successfully!';
PRINT '';
PRINT '=== MULTI-TENANT DEMO OVERVIEW ===';
PRINT 'Organizations created:';
PRINT '- TechCorp Solutions (Tech company)';
PRINT '- Consultores & Asociados (Consulting firm)'; 
PRINT '- InnovaStart (Startup)';
PRINT '';
PRINT 'Key Multi-Tenant User: Pedro MultiOrg (multiuser@example.cl)';
PRINT '- TechCorp Solutions: VIEWER role (basic permissions)';
PRINT '- Consultores & Asociados: HR MANAGER role (high permissions)';
PRINT '- InnovaStart: SUPER ADMIN role (full permissions)';
PRINT '';
PRINT 'This demonstrates the core requirement: same user, different permissions per organization!';
PRINT '';
PRINT 'Other users have single-organization roles for comparison.';
PRINT 'Each organization has its own complete set of roles and permissions.';
GO