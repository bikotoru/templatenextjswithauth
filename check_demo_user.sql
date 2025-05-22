-- Script para verificar usuario demo admin@demo.com
USE demonextjs;

-- 1. Verificar si el usuario existe
SELECT 'USUARIO:' as tipo, id, name, email, active FROM users WHERE email = 'admin@demo.com';

-- 2. Verificar asignación a organización
SELECT 'ORGANIZACION:' as tipo, uo.user_id, o.name as org_name, uo.active
FROM user_organizations uo
JOIN organizations o ON uo.organization_id = o.id
WHERE uo.user_id = (SELECT id FROM users WHERE email = 'admin@demo.com');

-- 3. Verificar roles asignados
SELECT 'ROLES:' as tipo, r.name as role_name, o.name as org_name, ura.active
FROM user_role_assignments ura
JOIN roles r ON ura.role_id = r.id  
JOIN organizations o ON ura.organization_id = o.id
WHERE ura.user_id = (SELECT id FROM users WHERE email = 'admin@demo.com');

-- 4. Verificar permisos (directos)
SELECT 'PERMISOS DIRECTOS:' as tipo, p.name as permission_name, o.name as org_name
FROM user_permission_assignments upa
JOIN permissions p ON upa.permission_id = p.id
JOIN organizations o ON upa.organization_id = o.id  
WHERE upa.user_id = (SELECT id FROM users WHERE email = 'admin@demo.com');

-- 5. Verificar permisos por roles
SELECT 'PERMISOS POR ROLES:' as tipo, p.name as permission_name, r.name as role_name, o.name as org_name
FROM user_role_assignments ura
JOIN role_permission_assignments rpa ON ura.role_id = rpa.role_id
JOIN permissions p ON rpa.permission_id = p.id
JOIN roles r ON ura.role_id = r.id
JOIN organizations o ON ura.organization_id = o.id
WHERE ura.user_id = (SELECT id FROM users WHERE email = 'admin@demo.com');

-- 6. Verificar sesiones activas
SELECT 'SESIONES:' as tipo, session_token, expires_at, organization_id, last_activity
FROM user_sessions 
WHERE user_id = (SELECT id FROM users WHERE email = 'admin@demo.com')
AND expires_at > GETDATE();