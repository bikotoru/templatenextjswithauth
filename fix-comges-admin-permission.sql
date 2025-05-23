-- Agregar permiso admin:access a la organización Comges y asignarlo al rol Admin

DECLARE @org_id UNIQUEIDENTIFIER = '4DBEAB08-D496-4E97-A1B3-A79EE3313F49'; -- ID de Comges
DECLARE @superadmin_id INT = 1; -- ID del super admin
DECLARE @permission_id INT;

-- Verificar si ya existe el permiso (por si acaso)
IF NOT EXISTS (
    SELECT 1 FROM permissions 
    WHERE organization_id = @org_id AND name = 'admin:access'
)
BEGIN
    -- Crear el permiso admin:access para Comges
    INSERT INTO permissions (name, description, category, organization_id, system_hidden, active, created_at, updated_at, created_by_id, updated_by_id)
    VALUES ('admin:access', 'Acceso al panel de administración', 'admin', @org_id, 0, 1, GETDATE(), GETDATE(), @superadmin_id, @superadmin_id);
    
    SET @permission_id = SCOPE_IDENTITY();
    PRINT 'Permiso admin:access creado con ID: ' + CAST(@permission_id AS NVARCHAR(10));
    
    -- Asignar este permiso al rol Admin de Comges
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
      AND r.active = 1;
    
    PRINT 'Permiso admin:access asignado al rol Admin de Comges';
END
ELSE
BEGIN
    PRINT 'El permiso admin:access ya existe para Comges';
END

-- Verificar el resultado
SELECT 
    'Comges' as organization_name,
    p.name as permission_name,
    r.name as role_name,
    'AGREGADO' as status
FROM permissions p
INNER JOIN role_permission_assignments rpa ON p.id = rpa.permission_id
INNER JOIN roles r ON rpa.role_id = r.id
WHERE p.organization_id = @org_id
  AND p.name = 'admin:access'
  AND r.name = 'Admin'
  AND p.active = 1
  AND rpa.active = 1;