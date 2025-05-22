-- ============================================================================
-- LIMPIEZA INICIAL DE TABLAS (SI EXISTEN)
-- ============================================================================

-- Drop tables in correct order (respecting foreign key dependencies)
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
-- Versión: 3.0 Multi-Tenant con Super Admin
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
    created_by_id INT NULL, -- Referencia a users.id (quien creó este usuario)
    updated_by_id INT NULL, -- Referencia a users.id (quien lo modificó por última vez)
    
    -- Índices
    INDEX IX_users_email (email),
    INDEX IX_users_active (active),
    INDEX IX_users_created_at (created_at),
    INDEX IX_users_updated_at (updated_at)
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
    
    -- Índices y constraints
    UNIQUE(user_id, organization_id),
    INDEX IX_user_organizations_user_id (user_id),
    INDEX IX_user_organizations_organization_id (organization_id),
    INDEX IX_user_organizations_active (active),
    INDEX IX_user_organizations_created_at (created_at)
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

-- Tabla de Asignación Rol-Permiso (Many-to-Many)
CREATE TABLE role_permission_assignments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    organization_id UNIQUEIDENTIFIER NOT NULL,
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
    UNIQUE(role_id, permission_id, organization_id),
    INDEX IX_role_permission_assignments_role_id (role_id),
    INDEX IX_role_permission_assignments_permission_id (permission_id),
    INDEX IX_role_permission_assignments_organization_id (organization_id),
    INDEX IX_role_permission_assignments_active (active),
    INDEX IX_role_permission_assignments_created_at (created_at)
);
GO

-- Tabla de Asignación Usuario-Rol (Many-to-Many, Por Organización)
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
    UNIQUE(user_id, role_id, organization_id),
    INDEX IX_user_role_assignments_user_id (user_id),
    INDEX IX_user_role_assignments_role_id (role_id),
    INDEX IX_user_role_assignments_organization_id (organization_id),
    INDEX IX_user_role_assignments_active (active),
    INDEX IX_user_role_assignments_created_at (created_at)
);
GO

-- Tabla de Asignación Usuario-Permiso Directo (Many-to-Many, Por Organización)
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
    UNIQUE(user_id, permission_id, organization_id),
    INDEX IX_user_permission_assignments_user_id (user_id),
    INDEX IX_user_permission_assignments_permission_id (permission_id),
    INDEX IX_user_permission_assignments_organization_id (organization_id),
    INDEX IX_user_permission_assignments_active (active),
    INDEX IX_user_permission_assignments_created_at (created_at)
);
GO

-- Tabla de Sesiones de Usuario (Para autenticación y tracking de organización activa)
CREATE TABLE user_sessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id UNIQUEIDENTIFIER NULL, -- NULL para super admin
    session_token NVARCHAR(500) NOT NULL UNIQUE,
    expires_at DATETIME2 NOT NULL,
    last_activity DATETIME2 DEFAULT GETDATE(),
    
    -- Campos de auditoría obligatorios (sin organization_id porque es tabla de sistema)
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NOT NULL, -- El usuario que creó la sesión (normalmente el mismo user_id)
    updated_by_id INT NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Índices
    INDEX IX_user_sessions_user_id (user_id),
    INDEX IX_user_sessions_organization_id (organization_id),
    INDEX IX_user_sessions_session_token (session_token),
    INDEX IX_user_sessions_expires_at (expires_at),
    INDEX IX_user_sessions_created_at (created_at)
);
GO

-- Tabla de Log de Actividades (Por Organización)
CREATE TABLE activity_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    action NVARCHAR(100) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
    resource_type NVARCHAR(100) NOT NULL, -- 'USER', 'ROLE', 'PERMISSION', etc.
    resource_id NVARCHAR(100), -- ID del recurso afectado
    details NVARCHAR(MAX), -- JSON con detalles de la acción
    ip_address NVARCHAR(45), -- IPv4 o IPv6
    user_agent NVARCHAR(500),
    
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

-- Trigger para permissions
CREATE TRIGGER tr_permissions_update
ON permissions
AFTER UPDATE
AS
BEGIN
    UPDATE permissions 
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para roles
CREATE TRIGGER tr_roles_update
ON roles
AFTER UPDATE
AS
BEGIN
    UPDATE roles 
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para role_permission_assignments
CREATE TRIGGER tr_role_permission_assignments_update
ON role_permission_assignments
AFTER UPDATE
AS
BEGIN
    UPDATE role_permission_assignments 
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para user_role_assignments
CREATE TRIGGER tr_user_role_assignments_update
ON user_role_assignments
AFTER UPDATE
AS
BEGIN
    UPDATE user_role_assignments 
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- Trigger para user_permission_assignments
CREATE TRIGGER tr_user_permission_assignments_update
ON user_permission_assignments
AFTER UPDATE
AS
BEGIN
    UPDATE user_permission_assignments 
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

-- ============================================================================
-- STORED PROCEDURES PARA CONSULTAS MULTI-TENANT
-- ============================================================================

-- Procedimiento para obtener permisos de usuario en una organización
CREATE PROCEDURE sp_get_user_permissions
    @user_id INT,
    @organization_id UNIQUEIDENTIFIER
AS
BEGIN
    SELECT DISTINCT p.name
    FROM permissions p
    WHERE p.organization_id = @organization_id
    AND p.active = 1
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
        AND ur.organization_id = @organization_id
        AND ur.active = 1
        AND rp.active = 1
    )
    ORDER BY p.name;
END;
GO

-- Procedimiento para verificar si un usuario tiene un permiso específico
CREATE PROCEDURE sp_check_user_permission
    @user_id INT,
    @permission_name NVARCHAR(100),
    @organization_id UNIQUEIDENTIFIER
AS
BEGIN
    DECLARE @has_permission BIT = 0;
    
    IF EXISTS (
        SELECT 1
        FROM permissions p
        WHERE p.name = @permission_name
        AND p.organization_id = @organization_id
        AND p.active = 1
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
            AND ur.organization_id = @organization_id
            AND ur.active = 1
            AND rp.active = 1
        )
    )
    BEGIN
        SET @has_permission = 1;
    END
    
    SELECT @has_permission as has_permission;
END;
GO

-- ============================================================================
-- DATOS INICIALES DEL SISTEMA
-- ============================================================================

PRINT 'Inicializando datos del sistema...';

-- Crear una organización temporal del sistema para los permisos ocultos
DECLARE @system_org_id UNIQUEIDENTIFIER = NEWID();

INSERT INTO organizations (id, name, logo, rut, active, created_at, updated_at)
VALUES (@system_org_id, 'SYSTEM', NULL, NULL, 1, GETDATE(), GETDATE());

-- Crear el usuario Super Admin
DECLARE @superadmin_id INT;

INSERT INTO users (email, password_hash, name, avatar, active, created_at, updated_at)
VALUES ('superadmin@system.local', '$2b$10$3sM.4iwzmjxcXSUS25rHj.JYqj2BxwbZpkFFncLaLoE2l2goSa94C', 'Super Admin', NULL, 1, GETDATE(), GETDATE());

SET @superadmin_id = SCOPE_IDENTITY();

-- Actualizar los campos created_by_id para la organización sistema
UPDATE organizations 
SET created_by_id = @superadmin_id, updated_by_id = @superadmin_id 
WHERE id = @system_org_id;

-- Actualizar los campos created_by_id para el super admin
UPDATE users 
SET created_by_id = @superadmin_id, updated_by_id = @superadmin_id 
WHERE id = @superadmin_id;

-- Crear permisos del sistema (OCULTOS)
INSERT INTO permissions (name, description, category, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id) VALUES
('system:manage', 'Gestión completa del sistema', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('dashboard:view', 'Acceso al dashboard', 'dashboard', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('admin:access', 'Acceso al panel de administración', 'admin', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('organizations:create', 'Crear nuevas organizaciones', 'organizations', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('organizations:edit', 'Modificar organizaciones existentes', 'organizations', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('organizations:deactivate', 'Desactivar organizaciones', 'organizations', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('organizations:view_all', 'Ver todas las organizaciones', 'organizations', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('users:create_global', 'Crear usuarios del sistema', 'users', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('users:assign_organizations', 'Asignar usuarios a organizaciones', 'users', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('users:manage_global', 'Gestionar usuarios globalmente', 'users', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id),
('roles:manage_system', 'Crear/modificar roles de sistema', 'roles', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);

-- Crear el rol Super Admin (OCULTO)
DECLARE @superadmin_role_id INT;

INSERT INTO roles (name, description, type, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id)
VALUES ('Super Admin', 'Administrador del sistema con acceso completo', 'system', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);

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
('dashboard:view', 'Ver dashboard', 'dashboard', @demo_org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);

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
WHERE p.organization_id = @demo_org_id AND p.system_hidden = 0;

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
PRINT '';
PRINT 'Características implementadas:';
PRINT '  ✓ Campos de auditoría obligatorios en todas las tablas';
PRINT '  ✓ Roles con tipos extensibles (permissions, workflow, custom, system)';
PRINT '  ✓ Permisos y roles con flags system_hidden';
PRINT '  ✓ Triggers automáticos para updated_at';
PRINT '  ✓ Índices optimizados para consultas multi-tenant';
PRINT '  ✓ Stored procedures para consultas de permisos';
PRINT '  ✓ Sin tablas relacionadas con CV';
PRINT '';
PRINT 'Datos iniciales creados:';
PRINT '  ✓ Super Admin: superadmin@system.local / Soporte.2019';
PRINT '  ✓ Usuario Demo: admin@demo.com / 123456';
PRINT '  ✓ Organización: SYSTEM (para permisos del sistema)';
PRINT '  ✓ Organización: Empresa Demo (organización de ejemplo)';
PRINT '  ✓ 11 permisos del sistema (ocultos)';
PRINT '  ✓ 10 permisos básicos (usuarios, roles, dashboard)';
PRINT '  ✓ 1 rol del sistema: Super Admin (oculto)';
PRINT '  ✓ 2 roles básicos: Admin, Usuario';
PRINT '';
PRINT 'IMPORTANTE:';
PRINT '  - Cambiar contraseñas en producción';
PRINT '  - El Super Admin puede acceder a cualquier organización';
PRINT '  - Los permisos y roles del sistema están ocultos para usuarios normales';
PRINT '  - La organización SYSTEM es solo para permisos del sistema';
PRINT '';
PRINT 'El proyecto está listo para usar!';