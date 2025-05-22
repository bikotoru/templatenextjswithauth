-- Script para limpiar sesiones y verificar permisos corregidos
USE demonextjs;

-- 1. Limpiar todas las sesiones para forzar re-login
DELETE FROM user_sessions;
PRINT 'Sesiones eliminadas - necesitarás hacer login nuevamente';

-- 2. Verificar permisos del usuario demo admin
SELECT 'PERMISOS ACTUALES:' as info, p.name as permission_name, o.name as org_name
FROM user_role_assignments ura
JOIN role_permission_assignments rpa ON ura.role_id = rpa.role_id
JOIN permissions p ON rpa.permission_id = p.id
JOIN roles r ON ura.role_id = r.id
JOIN organizations o ON ura.organization_id = o.id
WHERE ura.user_id = (SELECT id FROM users WHERE email = 'admin@demo.com')
ORDER BY p.name;

-- 3. Verificar que los permisos críticos existen
SELECT 'PERMISOS CRÍTICOS:' as info, 
       CASE WHEN EXISTS(SELECT 1 FROM permissions WHERE name = 'dashboard:view') THEN 'EXISTS' ELSE 'MISSING' END as dashboard_view,
       CASE WHEN EXISTS(SELECT 1 FROM permissions WHERE name = 'admin:access') THEN 'EXISTS' ELSE 'MISSING' END as admin_access,
       CASE WHEN EXISTS(SELECT 1 FROM permissions WHERE name = 'users:view') THEN 'EXISTS' ELSE 'MISSING' END as users_view;