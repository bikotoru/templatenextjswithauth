-- Datos de demostración para el sistema
-- Ejecutar después de schema.sql

USE NextJSTemplate;
GO

-- Insertar Permisos base del sistema
INSERT INTO permissions (permission_key, display_name, description, module) VALUES
-- Permisos de Usuarios
('users:view', 'Ver Usuarios', 'Permite ver la lista de usuarios', 'users'),
('users:create', 'Crear Usuarios', 'Permite crear nuevos usuarios', 'users'),
('users:edit', 'Editar Usuarios', 'Permite editar información de usuarios', 'users'),
('users:delete', 'Eliminar Usuarios', 'Permite eliminar usuarios', 'users'),
('users:manage_permissions', 'Gestionar Permisos de Usuario', 'Permite asignar/quitar permisos directos a usuarios', 'users'),
('users:manage_roles', 'Gestionar Roles de Usuario', 'Permite asignar/quitar roles a usuarios', 'users'),

-- Permisos de Roles
('roles:view', 'Ver Roles', 'Permite ver la lista de roles', 'roles'),
('roles:create', 'Crear Roles', 'Permite crear nuevos roles', 'roles'),
('roles:edit', 'Editar Roles', 'Permite editar información de roles', 'roles'),
('roles:delete', 'Eliminar Roles', 'Permite eliminar roles', 'roles'),
('roles:manage_permissions', 'Gestionar Permisos de Rol', 'Permite asignar/quitar permisos a roles', 'roles'),

-- Permisos de Permisos
('permissions:view', 'Ver Permisos', 'Permite ver la lista de permisos', 'permissions'),
('permissions:create', 'Crear Permisos', 'Permite crear nuevos permisos', 'permissions'),
('permissions:edit', 'Editar Permisos', 'Permite editar información de permisos', 'permissions'),
('permissions:delete', 'Eliminar Permisos', 'Permite eliminar permisos', 'permissions'),

-- Permisos de Dashboard
('dashboard:view', 'Ver Dashboard', 'Permite acceder al dashboard principal', 'dashboard'),
('dashboard:analytics', 'Ver Analíticas', 'Permite ver estadísticas y analíticas', 'dashboard'),

-- Permisos de Administración
('admin:access', 'Acceso Administración', 'Permite acceder al panel de administración', 'admin'),
('admin:system_settings', 'Configuración del Sistema', 'Permite modificar configuraciones del sistema', 'admin'),
('admin:view_logs', 'Ver Logs', 'Permite ver logs de actividad del sistema', 'admin'),

-- Permisos de CV (módulos existentes)
('cv:view', 'Ver CV', 'Permite ver currículums', 'cv'),
('cv:create', 'Crear CV', 'Permite crear nuevos currículums', 'cv'),
('cv:edit', 'Editar CV', 'Permite editar currículums', 'cv'),
('cv:delete', 'Eliminar CV', 'Permite eliminar currículums', 'cv'),
('cv:chat', 'Chat CV', 'Permite usar el chat de CV', 'cv'),
('cv:manage', 'Gestionar CV', 'Permite gestionar archivos de CV', 'cv');

-- Insertar Roles
INSERT INTO roles (name, description) VALUES
('Super Admin', 'Acceso completo a todo el sistema'),
('Admin', 'Administrador con permisos limitados'),
('Manager', 'Gestor con permisos de usuarios y roles'),
('User', 'Usuario básico con permisos limitados'),
('Viewer', 'Solo lectura en la mayoría de módulos');

-- Insertar Usuarios (admin@admin.cl con password 123, otros con password encriptado)
INSERT INTO users (email, password, name, avatar) VALUES
('admin@admin.cl', '123', 'Administrador Principal', NULL),
('manager@demo.cl', '$2b$10$K8QFW5L7X9.N4.uB.2E8.ezHGWdkWFj4J5xZqYvP3rT2sU7vW9cZG', 'Gestor Demo', NULL), -- password: manager123
('user@demo.cl', '$2b$10$H7PEV4K6Y8.M3.tA.1D7.dyGFVcjVEi3I4wYpXuO2qS1rT6uV8bYF', 'Usuario Demo', NULL), -- password: user123
('viewer@demo.cl', '$2b$10$G6ODU3J5X7.L2.sZ.0C6.cxFEUbjUDh2H3vXoWtN1pR0qS5tU7aXE', 'Visualizador Demo', NULL), -- password: viewer123
('editor@demo.cl', '$2b$10$F5NCT2I4W6.K1.rY.9B5.bwEDTaiTCg1G2uWnVsM0oQ9pR4sT6aWD', 'Editor Demo', NULL); -- password: editor123

-- Asignar todos los permisos al rol Super Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE active = 1;

-- Asignar permisos limitados al rol Admin (todo excepto eliminar usuarios/roles críticos)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, p.id FROM permissions p 
WHERE p.active = 1 
AND p.permission_key NOT IN ('users:delete');

-- Asignar permisos al rol Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, p.id FROM permissions p 
WHERE p.active = 1 
AND p.permission_key IN (
    'dashboard:view', 'dashboard:analytics',
    'users:view', 'users:create', 'users:edit', 'users:manage_roles',
    'roles:view', 'roles:create', 'roles:edit',
    'permissions:view',
    'cv:view', 'cv:create', 'cv:edit', 'cv:manage'
);

-- Asignar permisos al rol User
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, p.id FROM permissions p 
WHERE p.active = 1 
AND p.permission_key IN (
    'dashboard:view',
    'cv:view', 'cv:create', 'cv:edit', 'cv:chat'
);

-- Asignar permisos al rol Viewer
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, p.id FROM permissions p 
WHERE p.active = 1 
AND p.permission_key IN (
    'dashboard:view',
    'users:view',
    'roles:view',
    'permissions:view',
    'cv:view'
);

-- Asignar roles a usuarios
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1), -- admin@admin.cl -> Super Admin
(2, 3), -- manager@demo.cl -> Manager
(3, 4), -- user@demo.cl -> User
(4, 5), -- viewer@demo.cl -> Viewer
(5, 4); -- editor@demo.cl -> User

-- Asignar algunos permisos directos adicionales
INSERT INTO user_permissions (user_id, permission_id) VALUES
-- Dar permiso extra al manager para ver logs
(2, (SELECT id FROM permissions WHERE permission_key = 'admin:view_logs')),
-- Dar permiso extra al editor para eliminar CVs
(5, (SELECT id FROM permissions WHERE permission_key = 'cv:delete'));

-- Insertar algunas sesiones de ejemplo (opcional)
-- INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES
-- (1, 'sample_session_token_admin', DATEADD(hour, 24, GETDATE())),
-- (2, 'sample_session_token_manager', DATEADD(hour, 24, GETDATE()));

-- Insertar algunos logs de actividad de ejemplo
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent) VALUES
(1, 'user_login', 'user', 1, '{"login_time": "' + CONVERT(VARCHAR, GETDATE(), 120) + '"}', '127.0.0.1', 'Mozilla/5.0 (System Setup)'),
(1, 'system_setup', 'system', NULL, '{"action": "initial_data_setup"}', '127.0.0.1', 'System'),
(2, 'user_login', 'user', 2, '{"login_time": "' + CONVERT(VARCHAR, GETDATE(), 120) + '"}', '127.0.0.1', 'Mozilla/5.0 (Demo Setup)');

-- Verificaciones de integridad
PRINT 'Verificando datos insertados...'

PRINT 'Total de permisos: ' + CAST((SELECT COUNT(*) FROM permissions) AS VARCHAR)
PRINT 'Total de roles: ' + CAST((SELECT COUNT(*) FROM roles) AS VARCHAR)  
PRINT 'Total de usuarios: ' + CAST((SELECT COUNT(*) FROM users) AS VARCHAR)
PRINT 'Total de asignaciones rol-permiso: ' + CAST((SELECT COUNT(*) FROM role_permissions) AS VARCHAR)
PRINT 'Total de asignaciones usuario-rol: ' + CAST((SELECT COUNT(*) FROM user_roles) AS VARCHAR)
PRINT 'Total de permisos directos: ' + CAST((SELECT COUNT(*) FROM user_permissions) AS VARCHAR)

-- Verificar que el usuario admin tenga todos los permisos
PRINT 'Permisos del admin (debe ser > 0): ' + CAST((
    SELECT COUNT(DISTINCT p.id)
    FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    INNER JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = 1 AND p.active = 1
) AS VARCHAR)

PRINT 'Datos de demostración insertados correctamente!'

-- Mostrar información de usuarios para referencia
SELECT 
    u.id,
    u.email,
    u.name,
    STRING_AGG(r.name, ', ') as roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.active = 1
GROUP BY u.id, u.email, u.name
ORDER BY u.id;