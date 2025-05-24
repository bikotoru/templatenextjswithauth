-- Crear tabla theme_settings para configuración de temas por organización
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
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Índices obligatorios
    INDEX IX_theme_settings_active (active),
    INDEX IX_theme_settings_organization_id (organization_id),
    INDEX IX_theme_settings_created_at (created_at),
    INDEX IX_theme_settings_updated_at (updated_at),
    
    -- Índices específicos
    INDEX IX_theme_settings_palette_key (palette_key),
    INDEX IX_theme_settings_is_active (is_active),
    
    -- Constraint: Una configuración activa por organización
    CONSTRAINT UQ_theme_settings_org_active UNIQUE (organization_id, is_active)
);

-- Trigger para updated_at automático
CREATE TRIGGER tr_theme_settings_update
ON theme_settings
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE theme_settings 
    SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;

-- Insertar configuración por defecto para organizaciones existentes
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
    1,  -- Usuario admin por defecto
    1
FROM organizations o
WHERE o.active = 1
AND NOT EXISTS (
    SELECT 1 FROM theme_settings ts 
    WHERE ts.organization_id = o.id 
    AND ts.active = 1
);