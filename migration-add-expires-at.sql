-- ============================================================================
-- MIGRACIÓN: Agregar campo expires_at a tabla organizations
-- Fecha: 2025-01-22
-- Descripción: Agrega sistema de expiración de organizaciones para planes
-- ============================================================================

PRINT 'Iniciando migración: Agregar expires_at a organizations...';

-- Verificar si el campo ya existe
IF NOT EXISTS (
    SELECT * 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'organizations' 
    AND COLUMN_NAME = 'expires_at'
)
BEGIN
    -- Agregar el campo expires_at
    ALTER TABLE organizations 
    ADD expires_at DATETIME2 NULL;
    
    PRINT '✓ Campo expires_at agregado a tabla organizations';
    
    -- Crear índice para el campo expires_at
    CREATE INDEX IX_organizations_expires_at ON organizations(expires_at);
    
    PRINT '✓ Índice IX_organizations_expires_at creado';
    
    -- Comentario sobre el uso del campo
    EXEC sp_addextendedproperty 
        @name = N'MS_Description',
        @value = N'Fecha de expiración de la organización. NULL significa que nunca expira',
        @level0type = N'SCHEMA', @level0name = 'dbo',
        @level1type = N'TABLE', @level1name = 'organizations',
        @level2type = N'COLUMN', @level2name = 'expires_at';
    
    PRINT '✓ Documentación del campo agregada';
END
ELSE
BEGIN
    PRINT '⚠ El campo expires_at ya existe en la tabla organizations';
END

-- Verificar que la migración fue exitosa
IF EXISTS (
    SELECT * 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'organizations' 
    AND COLUMN_NAME = 'expires_at'
    AND DATA_TYPE = 'datetime2'
    AND IS_NULLABLE = 'YES'
)
BEGIN
    PRINT '✅ Migración completada exitosamente';
    PRINT '';
    PRINT 'NOTAS:';
    PRINT '- expires_at NULL = La organización nunca expira';
    PRINT '- expires_at con fecha = La organización expira en esa fecha';
    PRINT '- Se debe implementar validación en el código de autenticación';
    PRINT '';
END
ELSE
BEGIN
    PRINT '❌ Error en la migración. Verificar manualmente.';
END

PRINT 'Migración finalizada.';