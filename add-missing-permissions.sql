-- ============================================================================
-- SCRIPT PARA AGREGAR PERMISOS FALTANTES AL SUPER ADMIN
-- Ejecutar este script para agregar los permisos básicos que faltan
-- ============================================================================

-- Obtener IDs necesarios
DECLARE @system_org_id UNIQUEIDENTIFIER;
DECLARE @superadmin_id INT;
DECLARE @superadmin_role_id INT;

-- Buscar la organización SYSTEM
SELECT @system_org_id = id FROM organizations WHERE name = 'SYSTEM';

-- Buscar el usuario Super Admin
SELECT @superadmin_id = id FROM users WHERE email = 'superadmin@system.local';

-- Buscar el rol Super Admin
SELECT @superadmin_role_id = id FROM roles WHERE name = 'Super Admin' AND system_hidden = 1;

PRINT 'IDs encontrados:';
PRINT '  - System Org ID: ' + CAST(@system_org_id AS NVARCHAR(50));
PRINT '  - Super Admin User ID: ' + CAST(@superadmin_id AS NVARCHAR(10));
PRINT '  - Super Admin Role ID: ' + CAST(@superadmin_role_id AS NVARCHAR(10));

-- Verificar que se encontraron todos los IDs
IF @system_org_id IS NULL OR @superadmin_id IS NULL OR @superadmin_role_id IS NULL
BEGIN
    PRINT 'ERROR: No se pudieron encontrar todos los IDs necesarios';
    RETURN;
END

-- Agregar permisos faltantes si no existen
IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'dashboard:view' AND organization_id = @system_org_id)
BEGIN
    INSERT INTO permissions (name, description, category, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id)
    VALUES ('dashboard:view', 'Acceso al dashboard', 'dashboard', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);
    PRINT '✓ Agregado permiso: dashboard:view';
END
ELSE
BEGIN
    PRINT '- Permiso dashboard:view ya existe';
END

IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'admin:access' AND organization_id = @system_org_id)
BEGIN
    INSERT INTO permissions (name, description, category, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id)
    VALUES ('admin:access', 'Acceso al panel de administración', 'admin', @system_org_id, 1, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);
    PRINT '✓ Agregado permiso: admin:access';
END
ELSE
BEGIN
    PRINT '- Permiso admin:access ya existe';
END

-- Asignar nuevos permisos al rol Super Admin
DECLARE @dashboard_permission_id INT, @admin_permission_id INT;

SELECT @dashboard_permission_id = id FROM permissions WHERE name = 'dashboard:view' AND organization_id = @system_org_id;
SELECT @admin_permission_id = id FROM permissions WHERE name = 'admin:access' AND organization_id = @system_org_id;

-- Asignar dashboard:view
IF NOT EXISTS (
    SELECT 1 FROM role_permission_assignments 
    WHERE role_id = @superadmin_role_id 
    AND permission_id = @dashboard_permission_id 
    AND active = 1
)
BEGIN
    INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, assigned_at, active, created_at, updated_at, created_by_id, updated_by_id)
    VALUES (@superadmin_role_id, @dashboard_permission_id, @system_org_id, GETDATE(), 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);
    PRINT '✓ Asignado dashboard:view al Super Admin';
END
ELSE
BEGIN
    PRINT '- dashboard:view ya está asignado al Super Admin';
END

-- Asignar admin:access
IF NOT EXISTS (
    SELECT 1 FROM role_permission_assignments 
    WHERE role_id = @superadmin_role_id 
    AND permission_id = @admin_permission_id 
    AND active = 1
)
BEGIN
    INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, assigned_at, active, created_at, updated_at, created_by_id, updated_by_id)
    VALUES (@superadmin_role_id, @admin_permission_id, @system_org_id, GETDATE(), 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);
    PRINT '✓ Asignado admin:access al Super Admin';
END
ELSE
BEGIN
    PRINT '- admin:access ya está asignado al Super Admin';
END

-- Verificar permisos del Super Admin
PRINT '';
PRINT 'Verificando permisos del Super Admin:';
SELECT p.name as permiso, p.description as descripcion
FROM permissions p
INNER JOIN role_permission_assignments rpa ON p.id = rpa.permission_id
WHERE rpa.role_id = @superadmin_role_id 
AND rpa.active = 1 
AND p.active = 1
ORDER BY p.name;

PRINT '';
PRINT '✅ Script completado exitosamente';
PRINT 'El Super Admin ahora debería tener acceso al dashboard y panel de administración';