-- Verificar si existen organizaciones
IF NOT EXISTS (SELECT 1 FROM organizations WHERE active = 1)
BEGIN
    -- Insertar organización SYSTEM si no existe
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'SYSTEM')
    BEGIN
        INSERT INTO organizations (id, name, rut, logo, active, expires_at, created_at, created_by_id, updated_at, updated_by_id)
        VALUES (
            NEWID(),
            'SYSTEM',
            '00000000-0',
            NULL,
            1,
            DATEADD(year, 10, GETDATE()), -- Expira en 10 años
            GETDATE(),
            1, -- Super Admin ID
            GETDATE(),
            1
        );
        PRINT 'Organización SYSTEM creada';
    END
    ELSE
    BEGIN
        -- Activar la organización SYSTEM si existe pero está inactiva
        UPDATE organizations 
        SET active = 1, 
            expires_at = DATEADD(year, 10, GETDATE()),
            updated_at = GETDATE()
        WHERE name = 'SYSTEM';
        PRINT 'Organización SYSTEM activada';
    END
END

-- Verificar el Super Admin y su rol
DECLARE @superAdminId INT;
SELECT @superAdminId = id FROM users WHERE email = 'superadmin@system.local';

IF @superAdminId IS NOT NULL
BEGIN
    PRINT 'Super Admin encontrado con ID: ' + CAST(@superAdminId AS VARCHAR);
    
    -- Verificar si tiene el rol Super Admin asignado
    IF NOT EXISTS (
        SELECT 1 
        FROM user_role_assignments ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = @superAdminId 
        AND r.name = 'Super Admin'
        AND ur.active = 1
    )
    BEGIN
        -- Obtener el ID del rol Super Admin (debe estar asociado a la organización SYSTEM)
        DECLARE @superAdminRoleId INT;
        DECLARE @systemOrgId UNIQUEIDENTIFIER;
        
        SELECT @systemOrgId = id FROM organizations WHERE name = 'SYSTEM';
        
        IF @systemOrgId IS NULL
        BEGIN
            PRINT 'ERROR: No se encontró la organización SYSTEM';
        END
        ELSE
        BEGIN
            SELECT @superAdminRoleId = id FROM roles WHERE name = 'Super Admin' AND organization_id = @systemOrgId AND active = 1;
            
            -- Si no existe el rol Super Admin, crearlo
            IF @superAdminRoleId IS NULL
            BEGIN
                INSERT INTO roles (name, description, type, organization_id, system_hidden, active, created_at, created_by_id, updated_at, updated_by_id)
                VALUES ('Super Admin', 'Administrador del sistema con acceso completo', 'system', @systemOrgId, 1, 1, GETDATE(), @superAdminId, GETDATE(), @superAdminId);
                
                SET @superAdminRoleId = SCOPE_IDENTITY();
                PRINT 'Rol Super Admin creado con ID: ' + CAST(@superAdminRoleId AS VARCHAR);
            END
        END
        
        IF @superAdminRoleId IS NOT NULL
        BEGIN
            -- Asignar el rol Super Admin
            INSERT INTO user_role_assignments (user_id, role_id, organization_id, active, created_at, created_by_id, updated_at, updated_by_id)
            VALUES (@superAdminId, @superAdminRoleId, @systemOrgId, 1, GETDATE(), @superAdminId, GETDATE(), @superAdminId);
            PRINT 'Rol Super Admin asignado';
        END
        ELSE
        BEGIN
            PRINT 'ERROR: No se encontró el rol Super Admin en la tabla roles';
        END
    END
    ELSE
    BEGIN
        PRINT 'El usuario ya tiene el rol Super Admin asignado';
    END
END
ELSE
BEGIN
    PRINT 'ERROR: No se encontró el usuario superadmin@system.local';
END

-- Mostrar estado actual
SELECT 'Organizaciones activas:' as Info, COUNT(*) as Total FROM organizations WHERE active = 1;
SELECT 'Usuario Super Admin:' as Info, u.id, u.email, r.name as role_name
FROM users u
LEFT JOIN user_role_assignments ur ON u.id = ur.user_id AND ur.active = 1
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'superadmin@system.local';