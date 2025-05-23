-- Agregar permiso admin:access a organizaciones existentes que no lo tengan
-- y asignarlo a roles Admin existentes

DECLARE @superadmin_id INT = 1; -- ID del super admin

-- Obtener organizaciones que no tienen el permiso admin:access
DECLARE organization_cursor CURSOR FOR
SELECT o.id, o.name 
FROM organizations o
WHERE o.name != 'SYSTEM' 
  AND o.active = 1
  AND NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.organization_id = o.id 
      AND p.name = 'admin:access'
  );

DECLARE @org_id UNIQUEIDENTIFIER;
DECLARE @org_name NVARCHAR(255);
DECLARE @permission_id INT;

OPEN organization_cursor;
FETCH NEXT FROM organization_cursor INTO @org_id, @org_name;

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT 'Procesando organización: ' + @org_name;
    
    -- Crear el permiso admin:access para esta organización
    INSERT INTO permissions (name, description, category, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id)
    VALUES ('admin:access', 'Acceso al panel de administración', 'admin', @org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);
    
    SET @permission_id = SCOPE_IDENTITY();
    PRINT 'Permiso admin:access creado con ID: ' + CAST(@permission_id AS NVARCHAR(10));
    
    -- Asignar este permiso a todos los roles Admin de esta organización
    INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, assigned_at, active, created_at, updated_at, created_by_id, updated_by_id)
    SELECT 
        r.id,
        @permission_id,
        @org_id,
        GETDATE(),
        1,
        GETDATE(),
        GETDATE(),
        @superadmin_id,
        @superadmin_id
    FROM roles r 
    WHERE r.organization_id = @org_id 
      AND r.name = 'Admin' 
      AND r.active = 1
      AND NOT EXISTS (
        SELECT 1 FROM role_permission_assignments rpa 
        WHERE rpa.role_id = r.id 
          AND rpa.permission_id = @permission_id
      );
    
    PRINT 'Permiso asignado a roles Admin de la organización: ' + @org_name;
    
    FETCH NEXT FROM organization_cursor INTO @org_id, @org_name;
END

CLOSE organization_cursor;
DEALLOCATE organization_cursor;

PRINT 'Proceso completado. Verificando resultados...';

-- Verificar resultados
SELECT 
    o.name as organization_name,
    p.name as permission_name,
    r.name as role_name,
    'OK' as status
FROM organizations o
INNER JOIN permissions p ON o.id = p.organization_id
INNER JOIN role_permission_assignments rpa ON p.id = rpa.permission_id
INNER JOIN roles r ON rpa.role_id = r.id
WHERE o.name != 'SYSTEM'
  AND p.name = 'admin:access'
  AND r.name = 'Admin'
  AND o.active = 1
  AND p.active = 1
  AND rpa.active = 1
ORDER BY o.name;