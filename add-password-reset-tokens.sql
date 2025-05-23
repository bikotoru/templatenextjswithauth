-- Tabla para tokens de recuperación de contraseña
CREATE TABLE password_reset_tokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    token NVARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME2 NOT NULL,
    used BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    used_at DATETIME2 NULL,
    ip_address NVARCHAR(45) NULL, -- IP que solicitó el reset
    user_agent NVARCHAR(500) NULL, -- User agent del navegador
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    
    -- Índices para optimizar búsquedas
    INDEX IX_password_reset_tokens_token (token),
    INDEX IX_password_reset_tokens_user_id (user_id),
    INDEX IX_password_reset_tokens_expires_at (expires_at),
    INDEX IX_password_reset_tokens_used (used),
    INDEX IX_password_reset_tokens_created_at (created_at)
);
GO

-- Agregar comentarios para documentar la tabla
EXEC sp_addextendedproperty 
    @name = N'MS_Description',
    @value = N'Tabla para almacenar tokens de recuperación de contraseña con control de expiración y uso único',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'password_reset_tokens';
GO

EXEC sp_addextendedproperty 
    @name = N'MS_Description',
    @value = N'Token único y seguro para el reset de contraseña (UUID o hash)',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'password_reset_tokens',
    @level2type = N'COLUMN', @level2name = N'token';
GO

EXEC sp_addextendedproperty 
    @name = N'MS_Description',
    @value = N'Fecha y hora de expiración del token (típicamente 24 horas desde la creación)',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'password_reset_tokens',
    @level2type = N'COLUMN', @level2name = N'expires_at';
GO

-- Stored procedure para limpiar tokens expirados (housekeeping)
CREATE PROCEDURE sp_cleanup_expired_reset_tokens
AS
BEGIN
    DELETE FROM password_reset_tokens 
    WHERE expires_at < GETDATE() 
       OR (used = 1 AND used_at < DATEADD(day, -7, GETDATE()));
    
    SELECT @@ROWCOUNT as deleted_tokens;
END;
GO

-- Stored procedure para invalidar todos los tokens de un usuario
CREATE PROCEDURE sp_invalidate_user_reset_tokens
    @user_id INT
AS
BEGIN
    UPDATE password_reset_tokens 
    SET used = 1, used_at = GETDATE()
    WHERE user_id = @user_id AND used = 0;
    
    SELECT @@ROWCOUNT as invalidated_tokens;
END;
GO

PRINT 'Tabla password_reset_tokens creada exitosamente';
PRINT 'Stored procedures para mantenimiento creados';
PRINT 'Sistema de recuperación de contraseñas listo para usar';