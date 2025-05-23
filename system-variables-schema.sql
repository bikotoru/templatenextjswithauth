-- =============================================
-- Sistema de Variables Configurables
-- Esquema completo de base de datos
-- =============================================

-- Tabla principal de variables de sistema
CREATE TABLE system_variables (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id UNIQUEIDENTIFIER NOT NULL,
    variable_key NVARCHAR(100) NOT NULL, -- 'purchase_order_number', 'max_purchase_amount', etc.
    variable_name NVARCHAR(200) NOT NULL, -- Nombre descriptivo
    variable_type NVARCHAR(50) NOT NULL, -- 'incremental', 'text', 'number', 'date', 'boolean', 'json'
    description NVARCHAR(500) NULL,
    category NVARCHAR(100) NULL, -- 'numbering', 'limits', 'settings', 'dates', 'business_rules'
    is_active BIT NOT NULL DEFAULT 1,
    is_required BIT NOT NULL DEFAULT 0,
    is_system BIT NOT NULL DEFAULT 0, -- Variables del sistema que no se pueden eliminar
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    
    CONSTRAINT FK_SystemVariables_Organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT FK_SystemVariables_CreatedBy 
        FOREIGN KEY (created_by_id) REFERENCES users(id),
    CONSTRAINT FK_SystemVariables_UpdatedBy 
        FOREIGN KEY (updated_by_id) REFERENCES users(id),
    CONSTRAINT UQ_SystemVariables_OrgKey 
        UNIQUE (organization_id, variable_key),
    CONSTRAINT CK_SystemVariables_Type 
        CHECK (variable_type IN ('incremental', 'text', 'number', 'date', 'boolean', 'json')),
    CONSTRAINT CK_SystemVariables_Category 
        CHECK (category IN ('numbering', 'limits', 'settings', 'dates', 'business_rules'))
);

-- Tabla para configuración de variables incrementales
CREATE TABLE system_variable_incremental_config (
    id INT IDENTITY(1,1) PRIMARY KEY,
    system_variable_id INT NOT NULL,
    prefix NVARCHAR(20) NOT NULL, -- 'OC-', 'FACT-', 'USR-'
    suffix NVARCHAR(20) NULL, -- Opcional: '-2024', etc.
    current_number INT NOT NULL DEFAULT 1,
    number_length INT NOT NULL DEFAULT 8, -- Padding con ceros: 00000001
    reset_frequency NVARCHAR(20) NULL, -- 'yearly', 'monthly', 'never'
    last_reset_date DATETIME2 NULL,
    
    CONSTRAINT FK_IncrementalConfig_Variable 
        FOREIGN KEY (system_variable_id) REFERENCES system_variables(id)
        ON DELETE CASCADE,
    CONSTRAINT CK_IncrementalConfig_ResetFreq 
        CHECK (reset_frequency IN ('yearly', 'monthly', 'never') OR reset_frequency IS NULL),
    CONSTRAINT CK_IncrementalConfig_NumberLength 
        CHECK (number_length BETWEEN 1 AND 20)
);

-- Tabla para valores de variables (no incrementales)
CREATE TABLE system_variable_values (
    id INT IDENTITY(1,1) PRIMARY KEY,
    system_variable_id INT NOT NULL,
    text_value NVARCHAR(MAX) NULL,      -- Para tipo 'text' y 'json'
    number_value DECIMAL(18,4) NULL,     -- Para tipo 'number'
    date_value DATETIME2 NULL,           -- Para tipo 'date'
    boolean_value BIT NULL,              -- Para tipo 'boolean'
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_by_id INT NOT NULL,
    
    CONSTRAINT FK_VariableValues_Variable 
        FOREIGN KEY (system_variable_id) REFERENCES system_variables(id)
        ON DELETE CASCADE,
    CONSTRAINT FK_VariableValues_UpdatedBy 
        FOREIGN KEY (updated_by_id) REFERENCES users(id)
);

-- Tabla de validaciones para variables
CREATE TABLE system_variable_validations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    system_variable_id INT NOT NULL,
    validation_type NVARCHAR(50) NOT NULL, -- 'min_value', 'max_value', 'regex', 'min_length', 'max_length'
    validation_value NVARCHAR(500) NOT NULL,
    error_message NVARCHAR(500) NULL,
    
    CONSTRAINT FK_VariableValidations_Variable 
        FOREIGN KEY (system_variable_id) REFERENCES system_variables(id)
        ON DELETE CASCADE,
    CONSTRAINT CK_VariableValidations_Type 
        CHECK (validation_type IN ('min_value', 'max_value', 'regex', 'min_length', 'max_length', 'required'))
);

-- Tabla de historial de números generados (para auditoría de incrementales)
CREATE TABLE system_variable_history (
    id INT IDENTITY(1,1) PRIMARY KEY,
    system_variable_id INT NOT NULL,
    generated_number INT NOT NULL,
    generated_code NVARCHAR(100) NOT NULL, -- El código completo generado
    used_by_id INT NOT NULL,
    used_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    context_info NVARCHAR(500) NULL, -- Info adicional: "Orden de compra #123"
    
    CONSTRAINT FK_SystemVariableHistory_Variable 
        FOREIGN KEY (system_variable_id) REFERENCES system_variables(id),
    CONSTRAINT FK_SystemVariableHistory_User 
        FOREIGN KEY (used_by_id) REFERENCES users(id)
);

-- Tabla de log de cambios para variables no incrementales
CREATE TABLE system_variable_change_log (
    id INT IDENTITY(1,1) PRIMARY KEY,
    system_variable_id INT NOT NULL,
    old_value NVARCHAR(MAX) NULL,
    new_value NVARCHAR(MAX) NULL,
    change_reason NVARCHAR(500) NULL,
    changed_by_id INT NOT NULL,
    changed_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT FK_VariableChangeLog_Variable 
        FOREIGN KEY (system_variable_id) REFERENCES system_variables(id),
    CONSTRAINT FK_VariableChangeLog_User 
        FOREIGN KEY (changed_by_id) REFERENCES users(id)
);

-- =============================================
-- Procedimientos almacenados
-- =============================================

-- Procedimiento para generar número incremental de forma atómica
CREATE PROCEDURE sp_GenerateNextNumber
    @OrganizationId UNIQUEIDENTIFIER,
    @VariableKey NVARCHAR(100),
    @UserId INT,
    @Context NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ErrorMessage NVARCHAR(500);
    DECLARE @NextNumber INT;
    DECLARE @GeneratedCode NVARCHAR(100);
    DECLARE @VariableId INT;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Verificar que la variable existe y es del tipo incremental
        SELECT @VariableId = sv.id
        FROM system_variables sv
        WHERE sv.organization_id = @OrganizationId 
          AND sv.variable_key = @VariableKey 
          AND sv.variable_type = 'incremental'
          AND sv.is_active = 1;
        
        IF @VariableId IS NULL
        BEGIN
            SET @ErrorMessage = 'Variable incremental no encontrada o inactiva: ' + @VariableKey;
            THROW 50001, @ErrorMessage, 1;
        END
        
        -- Incrementar contador de forma atómica
        UPDATE system_variable_incremental_config 
        SET current_number = current_number + 1,
            last_reset_date = CASE 
                WHEN reset_frequency = 'yearly' AND YEAR(GETDATE()) > YEAR(ISNULL(last_reset_date, '1900-01-01'))
                THEN GETDATE()
                WHEN reset_frequency = 'monthly' AND (YEAR(GETDATE()) > YEAR(ISNULL(last_reset_date, '1900-01-01')) OR MONTH(GETDATE()) > MONTH(ISNULL(last_reset_date, '1900-01-01')))
                THEN GETDATE()
                ELSE last_reset_date
            END
        WHERE system_variable_id = @VariableId;
        
        -- Verificar si necesita reset y aplicarlo
        UPDATE system_variable_incremental_config 
        SET current_number = CASE 
            WHEN reset_frequency = 'yearly' AND YEAR(GETDATE()) > YEAR(ISNULL(last_reset_date, '1900-01-01'))
            THEN 1
            WHEN reset_frequency = 'monthly' AND (YEAR(GETDATE()) > YEAR(ISNULL(last_reset_date, '1900-01-01')) OR MONTH(GETDATE()) > MONTH(ISNULL(last_reset_date, '1900-01-01')))
            THEN 1
            ELSE current_number
        END
        WHERE system_variable_id = @VariableId;
        
        -- Obtener el número generado y crear código
        SELECT 
            @NextNumber = sic.current_number,
            @GeneratedCode = sic.prefix + 
                FORMAT(sic.current_number, 'D' + CAST(sic.number_length AS VARCHAR)) + 
                ISNULL(sic.suffix, '')
        FROM system_variable_incremental_config sic
        WHERE sic.system_variable_id = @VariableId;
        
        -- Actualizar timestamp de la variable principal
        UPDATE system_variables 
        SET updated_at = GETDATE(),
            updated_by_id = @UserId
        WHERE id = @VariableId;
        
        -- Registrar en historial
        INSERT INTO system_variable_history (
            system_variable_id, 
            generated_number, 
            generated_code, 
            used_by_id, 
            context_info
        )
        VALUES (
            @VariableId, 
            @NextNumber, 
            @GeneratedCode, 
            @UserId, 
            @Context
        );
        
        COMMIT TRANSACTION;
        
        -- Devolver resultado
        SELECT 
            1 as success,
            @GeneratedCode as generated_code, 
            @NextNumber as number,
            NULL as error_message;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        SELECT 
            0 as success,
            NULL as generated_code,
            NULL as number,
            ERROR_MESSAGE() as error_message;
    END CATCH
END;

-- Índices para optimizar consultas
CREATE INDEX IX_SystemVariables_OrgType ON system_variables (organization_id, variable_type);
CREATE INDEX IX_SystemVariables_Category ON system_variables (organization_id, category);
CREATE INDEX IX_SystemVariableHistory_Variable ON system_variable_history (system_variable_id, used_at DESC);
CREATE INDEX IX_SystemVariableChangeLog_Variable ON system_variable_change_log (system_variable_id, changed_at DESC);