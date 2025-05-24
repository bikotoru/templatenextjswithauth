-- =====================================================
-- SCHEMA COMPLETO: SISTEMA DE TEMAS CORPORATIVOS
-- =====================================================
-- Este script puede ejecutarse múltiples veces sin problemas
-- Incluye: tabla, permisos, datos iniciales, triggers

USE [demonextjs];
GO

-- =====================================================
-- 1. CREAR TABLA theme_settings (SI NO EXISTE)
-- =====================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'theme_settings')
BEGIN
    CREATE TABLE theme_settings (
        id INT IDENTITY(1,1) PRIMARY KEY,
        
        -- Datos principales
        organization_id UNIQUEIDENTIFIER NOT NULL,
        palette_key NVARCHAR(50) NOT NULL,  -- 'corporate_blue', 'business_green', etc.
        is_active BIT DEFAULT 1,
        
        -- Customizaciones opcionales (futuro)
        custom_logo_url NVARCHAR(500),
        custom_favicon_url NVARCHAR(500),
        
        -- Campo de estado obligatorio
        active BIT DEFAULT 1,
        
        -- Campos de auditoría obligatorios
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by_id INT NOT NULL,
        updated_by_id INT NOT NULL,
        
        -- Foreign keys obligatorias
        FOREIGN KEY (organization_id) REFERENCES organizations(id),
        FOREIGN KEY (created_by_id) REFERENCES users(id),
        FOREIGN KEY (updated_by_id) REFERENCES users(id)
    );
    
    PRINT '✓ Tabla theme_settings creada exitosamente';
END
ELSE
BEGIN
    PRINT '→ Tabla theme_settings ya existe';
END
GO

-- =====================================================
-- 2. CREAR ÍNDICES (SI NO EXISTEN)
-- =====================================================

-- Índices obligatorios
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_theme_settings_active')
    CREATE INDEX IX_theme_settings_active ON theme_settings (active);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_theme_settings_organization_id')
    CREATE INDEX IX_theme_settings_organization_id ON theme_settings (organization_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_theme_settings_created_at')
    CREATE INDEX IX_theme_settings_created_at ON theme_settings (created_at);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_theme_settings_updated_at')
    CREATE INDEX IX_theme_settings_updated_at ON theme_settings (updated_at);

-- Índices específicos
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_theme_settings_palette_key')
    CREATE INDEX IX_theme_settings_palette_key ON theme_settings (palette_key);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_theme_settings_is_active')
    CREATE INDEX IX_theme_settings_is_active ON theme_settings (is_active);

PRINT '✓ Índices de theme_settings verificados/creados';
GO

-- =====================================================
-- 3. CREAR CONSTRAINT ÚNICO (SI NO EXISTE)
-- =====================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
               WHERE CONSTRAINT_NAME = 'UQ_theme_settings_org_active' 
               AND TABLE_NAME = 'theme_settings')
BEGIN
    ALTER TABLE theme_settings 
    ADD CONSTRAINT UQ_theme_settings_org_active 
    UNIQUE (organization_id, is_active);
    PRINT '✓ Constraint único UQ_theme_settings_org_active creado';
END
ELSE
BEGIN
    PRINT '→ Constraint UQ_theme_settings_org_active ya existe';
END
GO

-- =====================================================
-- 4. CREAR TRIGGER PARA updated_at (SI NO EXISTE)
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_theme_settings_update')
BEGIN
    EXEC('
    CREATE TRIGGER tr_theme_settings_update
    ON theme_settings
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        UPDATE theme_settings 
        SET updated_at = GETDATE()
        WHERE id IN (SELECT id FROM inserted);
    END
    ');
    PRINT '✓ Trigger tr_theme_settings_update creado';
END
ELSE
BEGIN
    PRINT '→ Trigger tr_theme_settings_update ya existe';
END
GO

-- =====================================================
-- 5. CREAR PERMISOS PARA TEMAS (SI NO EXISTEN)
-- =====================================================

-- Verificar si los permisos ya existen
DECLARE @SuperAdminUserId INT = 1; -- Usuario Super Admin por defecto

-- Permiso para ver configuración de temas
IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'themes:view' AND active = 1)
BEGIN
    INSERT INTO permissions (name, description, category, active, created_at, updated_at, created_by_id, updated_by_id)
    VALUES ('themes:view', 'Ver configuración de temas corporativos', 'system', 1, GETDATE(), GETDATE(), @SuperAdminUserId, @SuperAdminUserId);
    PRINT '✓ Permiso themes:view creado';
END
ELSE
BEGIN
    PRINT '→ Permiso themes:view ya existe';
END

-- Permiso para modificar configuración de temas
IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'themes:manage' AND active = 1)
BEGIN
    INSERT INTO permissions (name, description, category, active, created_at, updated_at, created_by_id, updated_by_id)
    VALUES ('themes:manage', 'Gestionar y modificar temas corporativos', 'system', 1, GETDATE(), GETDATE(), @SuperAdminUserId, @SuperAdminUserId);
    PRINT '✓ Permiso themes:manage creado';
END
ELSE
BEGIN
    PRINT '→ Permiso themes:manage ya existe';
END
GO

-- =====================================================
-- 6. ASIGNAR PERMISOS AL SUPER ADMIN (SI NO ESTÁN ASIGNADOS)
-- =====================================================

DECLARE @SuperAdminRoleId INT;
DECLARE @ThemesViewPermId INT;
DECLARE @ThemesManagePermId INT;

-- Obtener IDs necesarios
SELECT @SuperAdminRoleId = id FROM roles WHERE name = 'Super Admin' AND active = 1;
SELECT @ThemesViewPermId = id FROM permissions WHERE name = 'themes:view' AND active = 1;
SELECT @ThemesManagePermId = id FROM permissions WHERE name = 'themes:manage' AND active = 1;

-- Verificar que el rol Super Admin existe
IF @SuperAdminRoleId IS NOT NULL AND @ThemesViewPermId IS NOT NULL
BEGIN
    -- Asignar permiso themes:view
    IF NOT EXISTS (SELECT 1 FROM role_permission_assignments 
                   WHERE role_id = @SuperAdminRoleId 
                   AND permission_id = @ThemesViewPermId 
                   AND active = 1)
    BEGIN
        INSERT INTO role_permission_assignments (role_id, permission_id, active, created_at, updated_at, created_by_id, updated_by_id)
        VALUES (@SuperAdminRoleId, @ThemesViewPermId, 1, GETDATE(), GETDATE(), 1, 1);
        PRINT '✓ Permiso themes:view asignado a Super Admin';
    END
    ELSE
    BEGIN
        PRINT '→ Permiso themes:view ya está asignado a Super Admin';
    END
END

IF @SuperAdminRoleId IS NOT NULL AND @ThemesManagePermId IS NOT NULL
BEGIN
    -- Asignar permiso themes:manage
    IF NOT EXISTS (SELECT 1 FROM role_permission_assignments 
                   WHERE role_id = @SuperAdminRoleId 
                   AND permission_id = @ThemesManagePermId 
                   AND active = 1)
    BEGIN
        INSERT INTO role_permission_assignments (role_id, permission_id, active, created_at, updated_at, created_by_id, updated_by_id)
        VALUES (@SuperAdminRoleId, @ThemesManagePermId, 1, GETDATE(), GETDATE(), 1, 1);
        PRINT '✓ Permiso themes:manage asignado a Super Admin';
    END
    ELSE
    BEGIN
        PRINT '→ Permiso themes:manage ya está asignado a Super Admin';
    END
END
GO

-- =====================================================
-- 7. INSERTAR CONFIGURACIÓN POR DEFECTO (SI NO EXISTE)
-- =====================================================

-- Insertar configuración por defecto para organizaciones existentes
DECLARE @DefaultUserId INT = 1; -- Usuario por defecto para auditoría

INSERT INTO theme_settings (
    organization_id, 
    palette_key, 
    is_active,
    created_by_id, 
    updated_by_id
)
SELECT 
    o.id,
    'corporate_blue',  -- Paleta por defecto
    1,
    @DefaultUserId,
    @DefaultUserId
FROM organizations o
WHERE o.active = 1
AND NOT EXISTS (
    SELECT 1 FROM theme_settings ts 
    WHERE ts.organization_id = o.id 
    AND ts.active = 1
);

DECLARE @InsertedThemes INT = @@ROWCOUNT;
IF @InsertedThemes > 0
    PRINT '✓ ' + CAST(@InsertedThemes AS VARCHAR(10)) + ' configuraciones de tema por defecto creadas';
ELSE
    PRINT '→ Todas las organizaciones ya tienen configuración de tema';
GO

-- =====================================================
-- 8. VERIFICACIÓN FINAL
-- =====================================================

-- Contar elementos creados
DECLARE @ThemeSettingsCount INT;
DECLARE @ThemePermissionsCount INT;
DECLARE @ThemeRoleAssignments INT;

SELECT @ThemeSettingsCount = COUNT(*) FROM theme_settings WHERE active = 1;
SELECT @ThemePermissionsCount = COUNT(*) FROM permissions WHERE name LIKE 'themes:%' AND active = 1;
SELECT @ThemeRoleAssignments = COUNT(*) 
FROM role_permission_assignments rpa
INNER JOIN permissions p ON rpa.permission_id = p.id
WHERE p.name LIKE 'themes:%' AND rpa.active = 1;

PRINT '';
PRINT '=====================================================';
PRINT '       SISTEMA DE TEMAS CORPORATIVOS INSTALADO';
PRINT '=====================================================';
PRINT 'Configuraciones de tema: ' + CAST(@ThemeSettingsCount AS VARCHAR(10));
PRINT 'Permisos de tema: ' + CAST(@ThemePermissionsCount AS VARCHAR(10));
PRINT 'Asignaciones de permisos: ' + CAST(@ThemeRoleAssignments AS VARCHAR(10));
PRINT '';
PRINT '🎨 PALETAS DISPONIBLES:';
PRINT '   • corporate_blue (Azul Corporativo)';
PRINT '   • business_green (Verde Empresarial)';
PRINT '';
PRINT '🔑 PERMISOS CREADOS:';
PRINT '   • themes:view - Ver configuración de temas';
PRINT '   • themes:manage - Gestionar temas corporativos';
PRINT '';
PRINT '✅ Sistema listo para usar en: /admin/theme';
PRINT '=====================================================';
GO