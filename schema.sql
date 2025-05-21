-- Schema para Sistema de Gestión de Usuarios, Roles y Permisos
-- Base de datos: SQL Server

-- Crear base de datos (ejecutar por separado si es necesario)
-- CREATE DATABASE NextJSTemplate;
-- GO
-- USE NextJSTemplate;
-- GO

-- Tabla de Permisos
CREATE TABLE permissions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    permission_key NVARCHAR(100) NOT NULL UNIQUE,
    display_name NVARCHAR(255) NOT NULL,
    description NVARCHAR(500),
    module NVARCHAR(50) NOT NULL, -- ej: users, roles, reports
    active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Tabla de Roles
CREATE TABLE roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(500),
    active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Tabla de Usuarios
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    avatar NVARCHAR(500), -- URL del avatar
    active BIT DEFAULT 1,
    last_login DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Tabla de Relación Rol-Permisos (Many-to-Many)
CREATE TABLE role_permissions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- Tabla de Relación Usuario-Roles (Many-to-Many)
CREATE TABLE user_roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE(user_id, role_id)
);

-- Tabla de Permisos Directos de Usuario (Many-to-Many)
CREATE TABLE user_permissions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(user_id, permission_id)
);

-- Tabla de Sesiones (para manejo de autenticación)
CREATE TABLE user_sessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    session_token NVARCHAR(500) NOT NULL UNIQUE,
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de Logs de Actividad (opcional, para auditoría)
CREATE TABLE activity_logs (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id INT,
    action NVARCHAR(100) NOT NULL, -- ej: 'user_created', 'role_updated'
    entity_type NVARCHAR(50) NOT NULL, -- ej: 'user', 'role', 'permission'
    entity_id INT,
    old_values NVARCHAR(MAX), -- JSON con valores anteriores
    new_values NVARCHAR(MAX), -- JSON con valores nuevos
    ip_address NVARCHAR(45),
    user_agent NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para optimizar consultas
CREATE INDEX IX_users_email ON users(email);
CREATE INDEX IX_users_active ON users(active);
CREATE INDEX IX_permissions_key ON permissions(permission_key);
CREATE INDEX IX_permissions_module ON permissions(module);
CREATE INDEX IX_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IX_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IX_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IX_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IX_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IX_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX IX_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IX_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IX_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IX_activity_logs_created_at ON activity_logs(created_at);

-- Trigger para actualizar updated_at automáticamente
GO
CREATE TRIGGER tr_users_updated_at ON users
AFTER UPDATE AS
BEGIN
    UPDATE users 
    SET updated_at = GETDATE()
    FROM users u
    INNER JOIN inserted i ON u.id = i.id
END
GO

CREATE TRIGGER tr_roles_updated_at ON roles
AFTER UPDATE AS
BEGIN
    UPDATE roles 
    SET updated_at = GETDATE()
    FROM roles r
    INNER JOIN inserted i ON r.id = i.id
END
GO

CREATE TRIGGER tr_permissions_updated_at ON permissions
AFTER UPDATE AS
BEGIN
    UPDATE permissions 
    SET updated_at = GETDATE()
    FROM permissions p
    INNER JOIN inserted i ON p.id = i.id
END
GO

-- Procedimientos almacenados útiles

-- Obtener todos los permisos de un usuario (directos + por roles)
CREATE PROCEDURE sp_get_user_permissions
    @user_id INT
AS
BEGIN
    SELECT DISTINCT 
        p.id,
        p.permission_key,
        p.display_name,
        p.description,
        p.module,
        CASE 
            WHEN up.permission_id IS NOT NULL THEN 'direct'
            ELSE 'role'
        END as permission_source
    FROM permissions p
    LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = @user_id
    LEFT JOIN role_permissions rp ON p.id = rp.permission_id
    LEFT JOIN user_roles ur ON rp.role_id = ur.role_id AND ur.user_id = @user_id
    WHERE p.active = 1 
    AND (up.permission_id IS NOT NULL OR ur.user_id IS NOT NULL)
    ORDER BY p.module, p.display_name
END
GO

-- Verificar si un usuario tiene un permiso específico
CREATE PROCEDURE sp_check_user_permission
    @user_id INT,
    @permission_key NVARCHAR(100)
AS
BEGIN
    SELECT COUNT(*) as has_permission
    FROM permissions p
    WHERE p.permission_key = @permission_key
    AND p.active = 1
    AND p.id IN (
        -- Permisos directos
        SELECT up.permission_id 
        FROM user_permissions up 
        WHERE up.user_id = @user_id
        
        UNION
        
        -- Permisos por roles
        SELECT rp.permission_id 
        FROM role_permissions rp
        INNER JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = @user_id
    )
END
GO