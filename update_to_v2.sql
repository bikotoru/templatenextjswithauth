-- Script de Migración a Multi-Tenant v2.0
-- Actualiza la base de datos existente (v1.0) a multi-tenant (v2.0)
-- IMPORTANTE: Hacer backup de la base de datos antes de ejecutar este script

-- ============================================================================
-- CREAR NUEVAS TABLAS MULTI-TENANT
-- ============================================================================

-- Tabla de Organizaciones
CREATE TABLE organizations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    logo NVARCHAR(500), -- URL del logo
    rut NVARCHAR(50), -- RUT/Tax ID
    active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL,
    
    -- Índices
    INDEX IX_organizations_active (active),
    INDEX IX_organizations_rut (rut)
);

-- Tabla de Relación Usuario-Organización
CREATE TABLE user_organizations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    is_org_admin BIT DEFAULT 0,
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
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- ============================================================================
-- AGREGAR CAMPOS ESTÁNDAR A TABLAS EXISTENTES
-- ============================================================================

-- Tabla USERS - Agregar campos de auditoría
ALTER TABLE users ADD 
    created_by_id INT NULL,
    updated_by_id INT NULL;

-- Tabla PERMISSIONS - Agregar campos multi-tenant
ALTER TABLE permissions ADD 
    organization_id UNIQUEIDENTIFIER NULL, -- NULL temporalmente para migración
    created_by_id INT NULL,
    updated_by_id INT NULL;

-- Tabla ROLES - Agregar campos multi-tenant
ALTER TABLE roles ADD 
    organization_id UNIQUEIDENTIFIER NULL, -- NULL temporalmente para migración
    created_by_id INT NULL,
    updated_by_id INT NULL;

-- Tabla ROLE_PERMISSIONS - Agregar campos multi-tenant
ALTER TABLE role_permissions ADD 
    organization_id UNIQUEIDENTIFIER NULL, -- NULL temporalmente para migración
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL;

-- Tabla USER_ROLES - Agregar campos multi-tenant
ALTER TABLE user_roles ADD 
    organization_id UNIQUEIDENTIFIER NULL, -- NULL temporalmente para migración
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL;

-- Tabla USER_PERMISSIONS - Agregar campos multi-tenant
ALTER TABLE user_permissions ADD 
    organization_id UNIQUEIDENTIFIER NULL, -- NULL temporalmente para migración
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL;

-- Tabla USER_SESSIONS - Agregar campos multi-tenant
ALTER TABLE user_sessions ADD 
    organization_id UNIQUEIDENTIFIER NULL, -- NULL temporalmente para migración
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL;

-- Tabla ACTIVITY_LOGS - Agregar campos multi-tenant
ALTER TABLE activity_logs ADD 
    organization_id UNIQUEIDENTIFIER NULL, -- NULL temporalmente para migración
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NULL,
    updated_by_id INT NULL;

-- ============================================================================
-- MIGRACIÓN DE DATOS EXISTENTES
-- ============================================================================

-- Crear organización por defecto para datos existentes
DECLARE @default_org_id UNIQUEIDENTIFIER = NEWID();
DECLARE @system_user_id INT;

-- Insertar organización por defecto
INSERT INTO organizations (id, name, logo, rut, active, created_at, updated_at)
VALUES (@default_org_id, 'Organización Principal', NULL, NULL, 1, GETDATE(), GETDATE());

-- Obtener el primer usuario activo como usuario del sistema (o crear uno si no existe)
SELECT TOP 1 @system_user_id = id FROM users WHERE active = 1 ORDER BY id;

-- Si no hay usuarios, crear usuario del sistema
IF @system_user_id IS NULL
BEGIN
    INSERT INTO users (email, password, name, active, created_at, updated_at)
    VALUES ('system@system.com', 'SYSTEM_GENERATED', 'Sistema', 1, GETDATE(), GETDATE());
    
    SET @system_user_id = SCOPE_IDENTITY();
END

-- Actualizar organización con el usuario del sistema
UPDATE organizations 
SET created_by_id = @system_user_id, updated_by_id = @system_user_id
WHERE id = @default_org_id;

-- Asignar todos los usuarios existentes a la organización por defecto
INSERT INTO user_organizations (user_id, organization_id, is_org_admin, active, joined_at, created_at, updated_at, created_by_id, updated_by_id)
SELECT 
    id, 
    @default_org_id, 
    CASE WHEN id = @system_user_id THEN 1 ELSE 0 END, -- El primer usuario es admin
    1, 
    created_at, 
    GETDATE(), 
    GETDATE(),
    @system_user_id,
    @system_user_id
FROM users 
WHERE active = 1;

-- Actualizar permisos existentes con la organización por defecto
UPDATE permissions 
SET 
    organization_id = @default_org_id,
    created_by_id = @system_user_id,
    updated_by_id = @system_user_id;

-- Actualizar roles existentes con la organización por defecto
UPDATE roles 
SET 
    organization_id = @default_org_id,
    created_by_id = @system_user_id,
    updated_by_id = @system_user_id;

-- Actualizar role_permissions existentes con la organización por defecto
UPDATE role_permissions 
SET 
    organization_id = @default_org_id,
    created_by_id = @system_user_id,
    updated_by_id = @system_user_id;

-- Actualizar user_roles existentes con la organización por defecto
UPDATE user_roles 
SET 
    organization_id = @default_org_id,
    created_by_id = @system_user_id,
    updated_by_id = @system_user_id;

-- Actualizar user_permissions existentes con la organización por defecto
UPDATE user_permissions 
SET 
    organization_id = @default_org_id,
    created_by_id = @system_user_id,
    updated_by_id = @system_user_id;

-- Actualizar user_sessions existentes con la organización por defecto
UPDATE user_sessions 
SET 
    organization_id = @default_org_id,
    created_by_id = @system_user_id,
    updated_by_id = @system_user_id;

-- Actualizar activity_logs existentes con la organización por defecto
UPDATE activity_logs 
SET 
    organization_id = @default_org_id,
    created_by_id = @system_user_id,
    updated_by_id = @system_user_id;

-- Actualizar users con audit fields
UPDATE users 
SET 
    created_by_id = @system_user_id,
    updated_by_id = @system_user_id;

-- ============================================================================
-- HACER CAMPOS OBLIGATORIOS Y AGREGAR CONSTRAINTS
-- ============================================================================

-- Hacer organization_id NOT NULL después de la migración
ALTER TABLE permissions ALTER COLUMN organization_id UNIQUEIDENTIFIER NOT NULL;
ALTER TABLE roles ALTER COLUMN organization_id UNIQUEIDENTIFIER NOT NULL;
ALTER TABLE role_permissions ALTER COLUMN organization_id UNIQUEIDENTIFIER NOT NULL;
ALTER TABLE user_roles ALTER COLUMN organization_id UNIQUEIDENTIFIER NOT NULL;
ALTER TABLE user_permissions ALTER COLUMN organization_id UNIQUEIDENTIFIER NOT NULL;
ALTER TABLE user_sessions ALTER COLUMN organization_id UNIQUEIDENTIFIER NOT NULL;
ALTER TABLE activity_logs ALTER COLUMN organization_id UNIQUEIDENTIFIER NOT NULL;

-- ============================================================================
-- ACTUALIZAR CONSTRAINTS UNIQUE PARA MULTI-TENANT
-- ============================================================================

-- Eliminar constraints únicos existentes
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS UQ__permissions__permission_key;
ALTER TABLE roles DROP CONSTRAINT IF EXISTS UQ__roles__name;

-- Crear nuevos constraints únicos por organización
ALTER TABLE permissions ADD CONSTRAINT UQ_permissions_org_key UNIQUE (organization_id, permission_key);
ALTER TABLE roles ADD CONSTRAINT UQ_roles_org_name UNIQUE (organization_id, name);
ALTER TABLE role_permissions ADD CONSTRAINT UQ_role_permissions_org UNIQUE (organization_id, role_id, permission_id);
ALTER TABLE user_roles ADD CONSTRAINT UQ_user_roles_org UNIQUE (organization_id, user_id, role_id);
ALTER TABLE user_permissions ADD CONSTRAINT UQ_user_permissions_org UNIQUE (organization_id, user_id, permission_id);

-- ============================================================================
-- AGREGAR FOREIGN KEYS
-- ============================================================================

-- Foreign Keys para audit fields
ALTER TABLE users ADD CONSTRAINT FK_users_created_by FOREIGN KEY (created_by_id) REFERENCES users(id);
ALTER TABLE users ADD CONSTRAINT FK_users_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id);

ALTER TABLE organizations ADD CONSTRAINT FK_organizations_created_by FOREIGN KEY (created_by_id) REFERENCES users(id);
ALTER TABLE organizations ADD CONSTRAINT FK_organizations_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id);

ALTER TABLE user_organizations ADD CONSTRAINT FK_user_organizations_created_by FOREIGN KEY (created_by_id) REFERENCES users(id);
ALTER TABLE user_organizations ADD CONSTRAINT FK_user_organizations_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id);

-- Foreign Keys para organization_id
ALTER TABLE permissions ADD CONSTRAINT FK_permissions_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE permissions ADD CONSTRAINT FK_permissions_created_by FOREIGN KEY (created_by_id) REFERENCES users(id);
ALTER TABLE permissions ADD CONSTRAINT FK_permissions_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id);

ALTER TABLE roles ADD CONSTRAINT FK_roles_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE roles ADD CONSTRAINT FK_roles_created_by FOREIGN KEY (created_by_id) REFERENCES users(id);
ALTER TABLE roles ADD CONSTRAINT FK_roles_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id);

ALTER TABLE role_permissions ADD CONSTRAINT FK_role_permissions_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE role_permissions ADD CONSTRAINT FK_role_permissions_created_by FOREIGN KEY (created_by_id) REFERENCES users(id);
ALTER TABLE role_permissions ADD CONSTRAINT FK_role_permissions_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id);

ALTER TABLE user_roles ADD CONSTRAINT FK_user_roles_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE user_roles ADD CONSTRAINT FK_user_roles_created_by FOREIGN KEY (created_by_id) REFERENCES users(id);
ALTER TABLE user_roles ADD CONSTRAINT FK_user_roles_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id);

ALTER TABLE user_permissions ADD CONSTRAINT FK_user_permissions_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE user_permissions ADD CONSTRAINT FK_user_permissions_created_by FOREIGN KEY (created_by_id) REFERENCES users(id);
ALTER TABLE user_permissions ADD CONSTRAINT FK_user_permissions_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id);

ALTER TABLE user_sessions ADD CONSTRAINT FK_user_sessions_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE user_sessions ADD CONSTRAINT FK_user_sessions_created_by FOREIGN KEY (created_by_id) REFERENCES users(id);
ALTER TABLE user_sessions ADD CONSTRAINT FK_user_sessions_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id);

ALTER TABLE activity_logs ADD CONSTRAINT FK_activity_logs_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE activity_logs ADD CONSTRAINT FK_activity_logs_created_by FOREIGN KEY (created_by_id) REFERENCES users(id);
ALTER TABLE activity_logs ADD CONSTRAINT FK_activity_logs_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id);

-- ============================================================================
-- CREAR ÍNDICES OPTIMIZADOS PARA MULTI-TENANT
-- ============================================================================

-- Índices compuestos para performance
CREATE INDEX IX_permissions_org_active ON permissions (organization_id, active);
CREATE INDEX IX_permissions_org_module ON permissions (organization_id, module);

CREATE INDEX IX_roles_org_active ON roles (organization_id, active);

CREATE INDEX IX_role_permissions_org_role ON role_permissions (organization_id, role_id);
CREATE INDEX IX_role_permissions_org_permission ON role_permissions (organization_id, permission_id);

CREATE INDEX IX_user_roles_org_user ON user_roles (organization_id, user_id);
CREATE INDEX IX_user_roles_org_role ON user_roles (organization_id, role_id);

CREATE INDEX IX_user_permissions_org_user ON user_permissions (organization_id, user_id);
CREATE INDEX IX_user_permissions_org_permission ON user_permissions (organization_id, permission_id);

CREATE INDEX IX_user_sessions_org_user ON user_sessions (organization_id, user_id);
CREATE INDEX IX_user_sessions_org_expires ON user_sessions (organization_id, expires_at);

CREATE INDEX IX_activity_logs_org_user ON activity_logs (organization_id, user_id);
CREATE INDEX IX_activity_logs_org_created ON activity_logs (organization_id, created_at);

-- ============================================================================
-- CREAR STORED PROCEDURES MULTI-TENANT
-- ============================================================================

-- Procedimiento para obtener permisos de un usuario en una organización
CREATE PROCEDURE sp_get_user_permissions
    @user_id INT,
    @organization_id UNIQUEIDENTIFIER
AS
BEGIN
    SELECT DISTINCT p.permission_key, p.display_name, p.module
    FROM permissions p
    WHERE p.organization_id = @organization_id
    AND p.active = 1
    AND (
        -- Permisos directos del usuario
        p.id IN (
            SELECT up.permission_id 
            FROM user_permissions up 
            WHERE up.user_id = @user_id 
            AND up.organization_id = @organization_id
        )
        OR
        -- Permisos heredados por roles
        p.id IN (
            SELECT rp.permission_id 
            FROM role_permissions rp
            INNER JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = @user_id 
            AND ur.organization_id = @organization_id
            AND rp.organization_id = @organization_id
        )
    )
    ORDER BY p.module, p.display_name;
END;
GO

-- Procedimiento para validar si un usuario tiene un permiso específico
CREATE PROCEDURE sp_check_user_permission
    @user_id INT,
    @organization_id UNIQUEIDENTIFIER,
    @permission_key NVARCHAR(100)
AS
BEGIN
    DECLARE @has_permission BIT = 0;
    
    SELECT @has_permission = 1
    FROM permissions p
    WHERE p.organization_id = @organization_id
    AND p.permission_key = @permission_key
    AND p.active = 1
    AND (
        -- Permiso directo del usuario
        p.id IN (
            SELECT up.permission_id 
            FROM user_permissions up 
            WHERE up.user_id = @user_id 
            AND up.organization_id = @organization_id
        )
        OR
        -- Permiso heredado por roles
        p.id IN (
            SELECT rp.permission_id 
            FROM role_permissions rp
            INNER JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = @user_id 
            AND ur.organization_id = @organization_id
            AND rp.organization_id = @organization_id
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
-- CREAR TRIGGERS PARA AUDIT AUTOMÁTICO
-- ============================================================================

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER tr_users_updated_at ON users AFTER UPDATE AS
BEGIN
    UPDATE users SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

CREATE TRIGGER tr_organizations_updated_at ON organizations AFTER UPDATE AS
BEGIN
    UPDATE organizations SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

CREATE TRIGGER tr_user_organizations_updated_at ON user_organizations AFTER UPDATE AS
BEGIN
    UPDATE user_organizations SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

CREATE TRIGGER tr_permissions_updated_at ON permissions AFTER UPDATE AS
BEGIN
    UPDATE permissions SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

CREATE TRIGGER tr_roles_updated_at ON roles AFTER UPDATE AS
BEGIN
    UPDATE roles SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

CREATE TRIGGER tr_role_permissions_updated_at ON role_permissions AFTER UPDATE AS
BEGIN
    UPDATE role_permissions SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

CREATE TRIGGER tr_user_roles_updated_at ON user_roles AFTER UPDATE AS
BEGIN
    UPDATE user_roles SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

CREATE TRIGGER tr_user_permissions_updated_at ON user_permissions AFTER UPDATE AS
BEGIN
    UPDATE user_permissions SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

CREATE TRIGGER tr_user_sessions_updated_at ON user_sessions AFTER UPDATE AS
BEGIN
    UPDATE user_sessions SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

CREATE TRIGGER tr_activity_logs_updated_at ON activity_logs AFTER UPDATE AS
BEGIN
    UPDATE activity_logs SET updated_at = GETDATE() WHERE id IN (SELECT id FROM inserted);
END;
GO

-- ============================================================================
-- VERIFICACIÓN DE MIGRACIÓN
-- ============================================================================

-- Verificar que todos los datos fueron migrados correctamente
SELECT 
    'Migration Summary' as [Status],
    (SELECT COUNT(*) FROM organizations) as [Organizations],
    (SELECT COUNT(*) FROM users) as [Users],
    (SELECT COUNT(*) FROM user_organizations) as [User-Organization Relations],
    (SELECT COUNT(*) FROM permissions WHERE organization_id IS NOT NULL) as [Permissions Migrated],
    (SELECT COUNT(*) FROM roles WHERE organization_id IS NOT NULL) as [Roles Migrated],
    (SELECT COUNT(*) FROM role_permissions WHERE organization_id IS NOT NULL) as [Role-Permissions Migrated],
    (SELECT COUNT(*) FROM user_roles WHERE organization_id IS NOT NULL) as [User-Roles Migrated],
    (SELECT COUNT(*) FROM user_permissions WHERE organization_id IS NOT NULL) as [User-Permissions Migrated];

PRINT 'Migración completada exitosamente. Base de datos actualizada a Multi-Tenant v2.0';
PRINT 'IMPORTANTE: Verificar que todos los datos fueron migrados correctamente antes de continuar.';
PRINT 'IMPORTANTE: Actualizar la aplicación para usar la nueva estructura multi-tenant.';

/*
RESUMEN DE CAMBIOS:

1. NUEVAS TABLAS:
   - organizations: Tabla principal de tenants
   - user_organizations: Relación usuario-organización

2. CAMPOS AGREGADOS A TODAS LAS TABLAS:
   - organization_id: Aislamiento por tenant
   - created_by_id/updated_by_id: Audit trail
   - updated_at: Timestamp de última modificación (donde faltaba)

3. CONSTRAINTS ACTUALIZADOS:
   - Unique constraints ahora incluyen organization_id
   - Foreign keys para todas las relaciones
   - NOT NULL en campos críticos

4. ÍNDICES OPTIMIZADOS:
   - Índices compuestos con organization_id
   - Índices de performance para queries frecuentes

5. STORED PROCEDURES:
   - Procedimientos multi-tenant para permisos
   - Validación de permisos por organización
   - Obtención de organizaciones de usuario

6. TRIGGERS:
   - Actualización automática de timestamps
   - Audit trail automático

7. MIGRACIÓN DE DATOS:
   - Todos los datos existentes se asignan a "Organización Principal"
   - Todos los usuarios se asignan a la organización por defecto
   - Campos de audit se inicializan con usuario del sistema
*/