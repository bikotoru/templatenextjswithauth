-- ============================================================================
-- DATOS DE DEMOSTRACIÓN PARA SISTEMA MULTI-TENANT CV MANAGEMENT
-- Este script crea datos de ejemplo mostrando usuarios con diferentes roles en organizaciones
-- Concepto clave: El mismo usuario puede ser admin en una organización y usuario regular en otra
-- ============================================================================

-- Limpiar datos existentes (en orden de dependencias)
IF OBJECT_ID('user_role_assignments', 'U') IS NOT NULL DELETE FROM user_role_assignments;
IF OBJECT_ID('role_permission_assignments', 'U') IS NOT NULL DELETE FROM role_permission_assignments;
IF OBJECT_ID('user_permission_assignments', 'U') IS NOT NULL DELETE FROM user_permission_assignments;
IF OBJECT_ID('user_organizations', 'U') IS NOT NULL DELETE FROM user_organizations;
IF OBJECT_ID('user_sessions', 'U') IS NOT NULL DELETE FROM user_sessions;
IF OBJECT_ID('cv_processes', 'U') IS NOT NULL DELETE FROM cv_processes;
IF OBJECT_ID('activity_logs', 'U') IS NOT NULL DELETE FROM activity_logs;
IF OBJECT_ID('permissions', 'U') IS NOT NULL DELETE FROM permissions;
IF OBJECT_ID('roles', 'U') IS NOT NULL DELETE FROM roles;
IF OBJECT_ID('users', 'U') IS NOT NULL DELETE FROM users;
IF OBJECT_ID('organizations', 'U') IS NOT NULL DELETE FROM organizations;
GO

-- ============================================================================
-- CREAR ORGANIZACIONES DE DEMOSTRACIÓN
-- ============================================================================

-- Crear organizaciones de ejemplo
DECLARE @org1_id UNIQUEIDENTIFIER = NEWID();
DECLARE @org2_id UNIQUEIDENTIFIER = NEWID();
DECLARE @org3_id UNIQUEIDENTIFIER = NEWID();

INSERT INTO organizations (id, name, logo, rut, active, created_at, updated_at) VALUES
(@org1_id, 'TechCorp Solutions', 'https://example.com/logos/techcorp.png', '96.123.456-7', 1, GETDATE(), GETDATE()),
(@org2_id, 'Consultores & Asociados', 'https://example.com/logos/consultores.png', '78.987.654-3', 1, GETDATE(), GETDATE()),
(@org3_id, 'InnovaStart', 'https://example.com/logos/innovastart.png', '85.555.777-2', 1, GETDATE(), GETDATE());

PRINT '✓ Organizaciones creadas: TechCorp Solutions, Consultores & Asociados, InnovaStart';
GO

-- ============================================================================
-- CREAR USUARIOS DE DEMOSTRACIÓN
-- ============================================================================

-- Variables para almacenar IDs de usuarios
DECLARE @admin_id INT, @hr_manager_id INT, @hr_analyst_id INT, @recruiter_id INT;
DECLARE @consultant_id INT, @multiuser_id INT, @startup_founder_id INT, @viewer_id INT;

-- Obtener IDs de organizaciones
DECLARE @org1_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'TechCorp Solutions');
DECLARE @org2_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'Consultores & Asociados');
DECLARE @org3_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'InnovaStart');

-- Crear usuarios de ejemplo (todos con password: 123456)
-- Hash bcrypt para '123456': $2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq
INSERT INTO users (name, email, password_hash, active, created_at, updated_at) VALUES
-- Usuarios demo fáciles (recomendados para testing)
('Demo Admin', 'admin@demo.com', '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq', 1, GETDATE(), GETDATE()),
('Demo Manager', 'manager@demo.com', '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq', 1, GETDATE(), GETDATE()),
('Demo User', 'user@demo.com', '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq', 1, GETDATE(), GETDATE()),
('Demo Viewer', 'viewer@demo.com', '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq', 1, GETDATE(), GETDATE()),

-- Usuarios multi-tenant originales
('Carlos Administrador', 'admin@techcorp.cl', '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq', 1, GETDATE(), GETDATE()),
('María García', 'maria.garcia@consultores.cl', '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq', 1, GETDATE(), GETDATE()),
('Ana Pérez', 'ana.perez@techcorp.cl', '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq', 1, GETDATE(), GETDATE()),
('Juan Reclutador', 'juan.recruiter@innovastart.cl', '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq', 1, GETDATE(), GETDATE()),
('Laura Consultora', 'laura.consultant@consultores.cl', '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq', 1, GETDATE(), GETDATE()),
('Pedro MultiOrg', 'multiuser@example.cl', '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq', 1, GETDATE(), GETDATE()),
('Sofia Fundadora', 'sofia@innovastart.cl', '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq', 1, GETDATE(), GETDATE()),
('Roberto Viewer', 'viewer@techcorp.cl', '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq', 1, GETDATE(), GETDATE());

-- Obtener IDs de usuarios (incluyendo usuarios demo)
DECLARE @demo_admin_id INT, @demo_manager_id INT, @demo_user_id INT, @demo_viewer_id INT;

SELECT @demo_admin_id = id FROM users WHERE email = 'admin@demo.com';
SELECT @demo_manager_id = id FROM users WHERE email = 'manager@demo.com';
SELECT @demo_user_id = id FROM users WHERE email = 'user@demo.com';
SELECT @demo_viewer_id = id FROM users WHERE email = 'viewer@demo.com';

SELECT @admin_id = id FROM users WHERE email = 'admin@techcorp.cl';
SELECT @hr_manager_id = id FROM users WHERE email = 'maria.garcia@consultores.cl';
SELECT @hr_analyst_id = id FROM users WHERE email = 'ana.perez@techcorp.cl';
SELECT @recruiter_id = id FROM users WHERE email = 'juan.recruiter@innovastart.cl';
SELECT @consultant_id = id FROM users WHERE email = 'laura.consultant@consultores.cl';
SELECT @multiuser_id = id FROM users WHERE email = 'multiuser@example.cl';
SELECT @startup_founder_id = id FROM users WHERE email = 'sofia@innovastart.cl';
SELECT @viewer_id = id FROM users WHERE email = 'viewer@techcorp.cl';

PRINT '✓ 12 usuarios creados: 4 usuarios demo fáciles + 8 usuarios multi-tenant';
GO

-- ============================================================================
-- CREAR PERMISOS PARA CADA ORGANIZACIÓN
-- ============================================================================

-- Variables para almacenar IDs
DECLARE @admin_id INT = (SELECT TOP 1 id FROM users WHERE email = 'admin@techcorp.cl');
DECLARE @org1_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'TechCorp Solutions');
DECLARE @org2_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'Consultores & Asociados');
DECLARE @org3_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'InnovaStart');

-- Tabla temporal para almacenar IDs de permisos
DECLARE @perm_ids TABLE (name NVARCHAR(100), org_id UNIQUEIDENTIFIER, perm_id INT);

-- Insertar permisos para cada organización
WITH permission_names AS (
    SELECT 'dashboard:view' as name, 'Ver dashboard' as description UNION ALL
    SELECT 'users:view', 'Ver usuarios' UNION ALL
    SELECT 'users:create', 'Crear usuarios' UNION ALL
    SELECT 'users:edit', 'Editar usuarios' UNION ALL
    SELECT 'users:delete', 'Eliminar usuarios' UNION ALL
    SELECT 'roles:view', 'Ver roles' UNION ALL
    SELECT 'roles:create', 'Crear roles' UNION ALL
    SELECT 'roles:edit', 'Editar roles' UNION ALL
    SELECT 'roles:delete', 'Eliminar roles' UNION ALL
    SELECT 'permissions:view', 'Ver permisos' UNION ALL
    SELECT 'permissions:assign', 'Asignar permisos' UNION ALL
    SELECT 'admin:access', 'Acceso a administración' UNION ALL
    SELECT 'cv:view', 'Ver CVs' UNION ALL
    SELECT 'cv:upload', 'Subir CVs' UNION ALL
    SELECT 'cv:process', 'Procesar CVs' UNION ALL
    SELECT 'cv:download', 'Descargar CVs' UNION ALL
    SELECT 'cv:delete', 'Eliminar CVs' UNION ALL
    SELECT 'cv:chat', 'Chat con CVs' UNION ALL
    SELECT 'reports:view', 'Ver reportes' UNION ALL
    SELECT 'reports:export', 'Exportar reportes' UNION ALL
    SELECT 'settings:view', 'Ver configuración' UNION ALL
    SELECT 'settings:edit', 'Editar configuración' UNION ALL
    SELECT 'audit:view', 'Ver auditoría'
),
orgs AS (
    SELECT @org1_id as org_id UNION ALL
    SELECT @org2_id UNION ALL
    SELECT @org3_id
)
INSERT INTO permissions (name, description, organization_id, created_at, updated_at, created_by_id, updated_by_id)
OUTPUT inserted.name, inserted.organization_id, inserted.id INTO @perm_ids
SELECT 
    p.name,
    p.description,
    o.org_id,
    GETDATE(),
    GETDATE(),
    @admin_id,
    @admin_id
FROM permission_names p
CROSS JOIN orgs o;

PRINT '✓ 23 permisos creados para cada una de las 3 organizaciones (69 permisos totales)';
GO

-- ============================================================================
-- CREAR ROLES PARA CADA ORGANIZACIÓN
-- ============================================================================

-- Variables para almacenar IDs
DECLARE @admin_id INT = (SELECT TOP 1 id FROM users WHERE email = 'admin@techcorp.cl');
DECLARE @org1_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'TechCorp Solutions');
DECLARE @org2_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'Consultores & Asociados');
DECLARE @org3_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'InnovaStart');

-- Tabla temporal para almacenar IDs de roles
DECLARE @role_ids TABLE (name NVARCHAR(100), org_id UNIQUEIDENTIFIER, role_id INT);

-- Crear roles para cada organización
WITH role_names AS (
    SELECT 'Super Admin' as name, 'Administrador con acceso completo al sistema' as description UNION ALL
    SELECT 'HR Manager', 'Gerente de RRHH con permisos de gestión' UNION ALL
    SELECT 'HR Analyst', 'Analista de RRHH con permisos limitados' UNION ALL
    SELECT 'Recruiter', 'Reclutador con acceso a CVs' UNION ALL
    SELECT 'Viewer', 'Solo visualización de información básica'
),
orgs AS (
    SELECT @org1_id as org_id UNION ALL
    SELECT @org2_id UNION ALL
    SELECT @org3_id
)
INSERT INTO roles (name, description, organization_id, created_at, updated_at, created_by_id, updated_by_id)
OUTPUT inserted.name, inserted.organization_id, inserted.id INTO @role_ids
SELECT 
    r.name,
    r.description,
    o.org_id,
    GETDATE(),
    GETDATE(),
    @admin_id,
    @admin_id
FROM role_names r
CROSS JOIN orgs o;

PRINT '✓ 5 roles creados para cada una de las 3 organizaciones (15 roles totales)';
GO

-- ============================================================================
-- ASIGNAR PERMISOS A ROLES
-- ============================================================================

-- Variables necesarias
DECLARE @admin_id INT = (SELECT TOP 1 id FROM users WHERE email = 'admin@techcorp.cl');
DECLARE @org1_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'TechCorp Solutions');
DECLARE @org2_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'Consultores & Asociados');
DECLARE @org3_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'InnovaStart');

-- Recrear tablas temporales
DECLARE @perm_ids TABLE (name NVARCHAR(100), org_id UNIQUEIDENTIFIER, perm_id INT);
DECLARE @role_ids TABLE (name NVARCHAR(100), org_id UNIQUEIDENTIFIER, role_id INT);

-- Llenar tabla de permisos
INSERT INTO @perm_ids (name, org_id, perm_id)
SELECT name, organization_id, id FROM permissions;

-- Llenar tabla de roles
INSERT INTO @role_ids (name, org_id, role_id)
SELECT name, organization_id, id FROM roles;

-- Super Admin: Todos los permisos
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, created_at, created_by_id)
SELECT r.role_id, p.perm_id, r.org_id, GETDATE(), @admin_id
FROM @role_ids r
JOIN @perm_ids p ON r.org_id = p.org_id
WHERE r.name = 'Super Admin';

-- HR Manager: La mayoría de permisos excepto configuración del sistema
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, created_at, created_by_id)
SELECT r.role_id, p.perm_id, r.org_id, GETDATE(), @admin_id
FROM @role_ids r
JOIN @perm_ids p ON r.org_id = p.org_id
WHERE r.name = 'HR Manager' 
AND p.name NOT IN ('settings:edit', 'users:delete', 'roles:delete');

-- HR Analyst: Ver y operaciones básicas de CV
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, created_at, created_by_id)
SELECT r.role_id, p.perm_id, r.org_id, GETDATE(), @admin_id
FROM @role_ids r
JOIN @perm_ids p ON r.org_id = p.org_id
WHERE r.name = 'HR Analyst' 
AND p.name IN ('dashboard:view', 'users:view', 'cv:view', 'cv:upload', 'cv:process', 'cv:download', 'reports:view');

-- Recruiter: Permisos enfocados en CVs
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, created_at, created_by_id)
SELECT r.role_id, p.perm_id, r.org_id, GETDATE(), @admin_id
FROM @role_ids r
JOIN @perm_ids p ON r.org_id = p.org_id
WHERE r.name = 'Recruiter' 
AND p.name IN ('dashboard:view', 'cv:view', 'cv:upload', 'cv:process', 'cv:download', 'reports:view');

-- Viewer: Solo permisos de visualización
INSERT INTO role_permission_assignments (role_id, permission_id, organization_id, created_at, created_by_id)
SELECT r.role_id, p.perm_id, r.org_id, GETDATE(), @admin_id
FROM @role_ids r
JOIN @perm_ids p ON r.org_id = p.org_id
WHERE r.name = 'Viewer' 
AND p.name IN ('dashboard:view', 'users:view', 'cv:view', 'reports:view');

PRINT '✓ Permisos asignados a roles: Super Admin (todos), HR Manager (gestión), HR Analyst (CVs), Recruiter (CVs), Viewer (solo lectura)';
GO

-- ============================================================================
-- ASIGNAR USUARIOS A ORGANIZACIONES
-- ============================================================================

-- Variables necesarias
DECLARE @admin_id INT = (SELECT TOP 1 id FROM users WHERE email = 'admin@techcorp.cl');
DECLARE @hr_manager_id INT = (SELECT TOP 1 id FROM users WHERE email = 'maria.garcia@consultores.cl');
DECLARE @hr_analyst_id INT = (SELECT TOP 1 id FROM users WHERE email = 'ana.perez@techcorp.cl');
DECLARE @recruiter_id INT = (SELECT TOP 1 id FROM users WHERE email = 'juan.recruiter@innovastart.cl');
DECLARE @consultant_id INT = (SELECT TOP 1 id FROM users WHERE email = 'laura.consultant@consultores.cl');
DECLARE @multiuser_id INT = (SELECT TOP 1 id FROM users WHERE email = 'multiuser@example.cl');
DECLARE @startup_founder_id INT = (SELECT TOP 1 id FROM users WHERE email = 'sofia@innovastart.cl');
DECLARE @viewer_id INT = (SELECT TOP 1 id FROM users WHERE email = 'viewer@techcorp.cl');

DECLARE @org1_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'TechCorp Solutions');
DECLARE @org2_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'Consultores & Asociados');
DECLARE @org3_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'InnovaStart');

-- Asignar usuarios a organizaciones
INSERT INTO user_organizations (user_id, organization_id, joined_at, active, created_at, updated_at) VALUES
-- USUARIOS DEMO (fáciles para testing) - usando subconsultas
((SELECT id FROM users WHERE email = 'admin@demo.com'), @org1_id, GETDATE(), 1, GETDATE(), GETDATE()),     -- admin@demo.com -> TechCorp
((SELECT id FROM users WHERE email = 'manager@demo.com'), @org2_id, GETDATE(), 1, GETDATE(), GETDATE()),   -- manager@demo.com -> Consultores
((SELECT id FROM users WHERE email = 'user@demo.com'), @org3_id, GETDATE(), 1, GETDATE(), GETDATE()),      -- user@demo.com -> InnovaStart
((SELECT id FROM users WHERE email = 'viewer@demo.com'), @org1_id, GETDATE(), 1, GETDATE(), GETDATE()),    -- viewer@demo.com -> TechCorp

-- Usuarios de una sola organización
(@admin_id, @org1_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@hr_manager_id, @org2_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@hr_analyst_id, @org1_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@recruiter_id, @org3_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@consultant_id, @org2_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@startup_founder_id, @org3_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@viewer_id, @org1_id, GETDATE(), 1, GETDATE(), GETDATE()),

-- Usuario multi-organización (Pedro MultiOrg) - pertenece a las tres organizaciones
(@multiuser_id, @org1_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@multiuser_id, @org2_id, GETDATE(), 1, GETDATE(), GETDATE()),
(@multiuser_id, @org3_id, GETDATE(), 1, GETDATE(), GETDATE());

PRINT '✓ Usuarios asignados a organizaciones: 4 usuarios demo + usuarios multi-tenant';
GO

-- ============================================================================
-- ASIGNAR ROLES A USUARIOS (¡AQUÍ ESTÁ LA MAGIA MULTI-TENANT!)
-- ============================================================================

-- Variables necesarias
DECLARE @admin_id INT = (SELECT TOP 1 id FROM users WHERE email = 'admin@techcorp.cl');
DECLARE @hr_manager_id INT = (SELECT TOP 1 id FROM users WHERE email = 'maria.garcia@consultores.cl');
DECLARE @hr_analyst_id INT = (SELECT TOP 1 id FROM users WHERE email = 'ana.perez@techcorp.cl');
DECLARE @recruiter_id INT = (SELECT TOP 1 id FROM users WHERE email = 'juan.recruiter@innovastart.cl');
DECLARE @consultant_id INT = (SELECT TOP 1 id FROM users WHERE email = 'laura.consultant@consultores.cl');
DECLARE @multiuser_id INT = (SELECT TOP 1 id FROM users WHERE email = 'multiuser@example.cl');
DECLARE @startup_founder_id INT = (SELECT TOP 1 id FROM users WHERE email = 'sofia@innovastart.cl');
DECLARE @viewer_id INT = (SELECT TOP 1 id FROM users WHERE email = 'viewer@techcorp.cl');

DECLARE @org1_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'TechCorp Solutions');
DECLARE @org2_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'Consultores & Asociados');
DECLARE @org3_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'InnovaStart');

-- Asignar roles a usuarios
INSERT INTO user_role_assignments (user_id, role_id, organization_id, assigned_at, active, created_at, updated_at, created_by_id) VALUES

-- USUARIOS DEMO (fáciles para testing) - usando subconsultas
((SELECT id FROM users WHERE email = 'admin@demo.com'), (SELECT id FROM roles WHERE name = 'Super Admin' AND organization_id = @org1_id), @org1_id, GETDATE(), 1, GETDATE(), GETDATE(), (SELECT id FROM users WHERE email = 'admin@demo.com')),    -- admin@demo.com -> Super Admin en TechCorp
((SELECT id FROM users WHERE email = 'manager@demo.com'), (SELECT id FROM roles WHERE name = 'HR Manager' AND organization_id = @org2_id), @org2_id, GETDATE(), 1, GETDATE(), GETDATE(), (SELECT id FROM users WHERE email = 'admin@demo.com')),  -- manager@demo.com -> HR Manager en Consultores
((SELECT id FROM users WHERE email = 'user@demo.com'), (SELECT id FROM roles WHERE name = 'HR Analyst' AND organization_id = @org3_id), @org3_id, GETDATE(), 1, GETDATE(), GETDATE(), (SELECT id FROM users WHERE email = 'admin@demo.com')),    -- user@demo.com -> HR Analyst en InnovaStart
((SELECT id FROM users WHERE email = 'viewer@demo.com'), (SELECT id FROM roles WHERE name = 'Viewer' AND organization_id = @org1_id), @org1_id, GETDATE(), 1, GETDATE(), GETDATE(), (SELECT id FROM users WHERE email = 'admin@demo.com')),      -- viewer@demo.com -> Viewer en TechCorp

-- TechCorp Solutions (@org1_id)
(@admin_id, (SELECT id FROM roles WHERE name = 'Super Admin' AND organization_id = @org1_id), @org1_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),
(@hr_analyst_id, (SELECT id FROM roles WHERE name = 'HR Analyst' AND organization_id = @org1_id), @org1_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),
(@viewer_id, (SELECT id FROM roles WHERE name = 'Viewer' AND organization_id = @org1_id), @org1_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),

-- Consultores & Asociados (@org2_id)
(@hr_manager_id, (SELECT id FROM roles WHERE name = 'HR Manager' AND organization_id = @org2_id), @org2_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),
(@consultant_id, (SELECT id FROM roles WHERE name = 'HR Analyst' AND organization_id = @org2_id), @org2_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),

-- InnovaStart (@org3_id)
(@startup_founder_id, (SELECT id FROM roles WHERE name = 'Super Admin' AND organization_id = @org3_id), @org3_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),
(@recruiter_id, (SELECT id FROM roles WHERE name = 'Recruiter' AND organization_id = @org3_id), @org3_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),

-- *** USUARIO MULTI-TENANT *** - Pedro MultiOrg tiene diferentes roles en cada organización
-- En TechCorp: Es solo un Viewer (permisos mínimos)
(@multiuser_id, (SELECT id FROM roles WHERE name = 'Viewer' AND organization_id = @org1_id), @org1_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),
-- En Consultores: Es HR Manager (permisos altos)
(@multiuser_id, (SELECT id FROM roles WHERE name = 'HR Manager' AND organization_id = @org2_id), @org2_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id),
-- En InnovaStart: Es Super Admin (permisos completos)
(@multiuser_id, (SELECT id FROM roles WHERE name = 'Super Admin' AND organization_id = @org3_id), @org3_id, GETDATE(), 1, GETDATE(), GETDATE(), @admin_id);

PRINT '✓ ROLES ASIGNADOS - Usuarios demo + Pedro MultiOrg con diferentes roles por organización';
GO

-- ============================================================================
-- CREAR PROCESOS DE CV DE EJEMPLO
-- ============================================================================

-- Variables necesarias
DECLARE @org1_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'TechCorp Solutions');
DECLARE @org2_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'Consultores & Asociados');
DECLARE @org3_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'InnovaStart');

-- Crear procesos de CV de ejemplo para cada organización usando subconsultas
INSERT INTO cv_processes (name, status, file_path, processed_data, organization_id, created_at, updated_at, created_by_id, updated_by_id) VALUES
-- Procesos de TechCorp
('CV_Juan_Desarrollador.pdf', 'completed', '/uploads/org1/cv_juan_dev.pdf', '{"name":"Juan Desarrollador","skills":["JavaScript","React","Node.js"],"experience":3}', @org1_id, GETDATE(), GETDATE(), (SELECT id FROM users WHERE email = 'admin@techcorp.cl'), (SELECT id FROM users WHERE email = 'admin@techcorp.cl')),
('CV_Maria_Designer.pdf', 'processing', '/uploads/org1/cv_maria_design.pdf', NULL, @org1_id, GETDATE(), GETDATE(), (SELECT id FROM users WHERE email = 'ana.perez@techcorp.cl'), (SELECT id FROM users WHERE email = 'ana.perez@techcorp.cl')),

-- Procesos de Consultores
('CV_Carlos_Consultor.pdf', 'completed', '/uploads/org2/cv_carlos_cons.pdf', '{"name":"Carlos Consultor","skills":["Strategy","Management","SAP"],"experience":8}', @org2_id, GETDATE(), GETDATE(), (SELECT id FROM users WHERE email = 'maria.garcia@consultores.cl'), (SELECT id FROM users WHERE email = 'maria.garcia@consultores.cl')),
('CV_Ana_Analista.pdf', 'pending', '/uploads/org2/cv_ana_analyst.pdf', NULL, @org2_id, GETDATE(), GETDATE(), (SELECT id FROM users WHERE email = 'laura.consultant@consultores.cl'), (SELECT id FROM users WHERE email = 'laura.consultant@consultores.cl')),

-- Procesos de InnovaStart
('CV_Pedro_Startup.pdf', 'completed', '/uploads/org3/cv_pedro_startup.pdf', '{"name":"Pedro Startup","skills":["Python","AI","Entrepreneurship"],"experience":2}', @org3_id, GETDATE(), GETDATE(), (SELECT id FROM users WHERE email = 'sofia@innovastart.cl'), (SELECT id FROM users WHERE email = 'sofia@innovastart.cl')),
('CV_Laura_Marketing.pdf', 'failed', '/uploads/org3/cv_laura_mkt.pdf', NULL, @org3_id, GETDATE(), GETDATE(), (SELECT id FROM users WHERE email = 'juan.recruiter@innovastart.cl'), (SELECT id FROM users WHERE email = 'juan.recruiter@innovastart.cl'));

PRINT '✓ 6 procesos de CV creados (2 por cada organización)';
GO

-- ============================================================================
-- CREAR SESIONES ACTIVAS
-- ============================================================================

-- Variables necesarias
DECLARE @org1_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'TechCorp Solutions');
DECLARE @org2_id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM organizations WHERE name = 'Consultores & Asociados');

-- Crear sesiones activas (mostrando contexto de organización actual) usando subconsultas
INSERT INTO user_sessions (user_id, organization_id, session_token, expires_at, created_at, last_activity) VALUES
((SELECT id FROM users WHERE email = 'admin@techcorp.cl'), @org1_id, 'session_token_admin_tech', DATEADD(hour, 24, GETDATE()), GETDATE(), GETDATE()),
((SELECT id FROM users WHERE email = 'maria.garcia@consultores.cl'), @org2_id, 'session_token_manager_cons', DATEADD(hour, 24, GETDATE()), GETDATE(), GETDATE()),
((SELECT id FROM users WHERE email = 'multiuser@example.cl'), @org2_id, 'session_token_multi_cons', DATEADD(hour, 24, GETDATE()), GETDATE(), GETDATE()); -- Usuario multi actualmente activo en Consultores

PRINT '✓ 3 sesiones activas creadas (Pedro MultiOrg actualmente en Consultores & Asociados)';
GO

-- ============================================================================
-- RESUMEN DE DATOS CREADOS
-- ============================================================================

PRINT '';
PRINT '==========================================';
PRINT '    DATOS DE DEMOSTRACIÓN MULTI-TENANT   ';
PRINT '           CREADOS EXITOSAMENTE          ';
PRINT '==========================================';
PRINT '';
PRINT '📊 ORGANIZACIONES CREADAS:';
PRINT '   • TechCorp Solutions (Empresa tecnológica)';
PRINT '   • Consultores & Asociados (Firma consultora)';
PRINT '   • InnovaStart (Startup)';
PRINT '';
PRINT '👥 USUARIOS CREADOS: 12 usuarios totales';
PRINT '   • 4 usuarios DEMO fáciles (password: 123456)';
PRINT '   • 7 usuarios regulares multi-tenant';
PRINT '   • 1 usuario MULTI-TENANT: Pedro MultiOrg';
PRINT '';
PRINT '🔥 USUARIOS DEMO PARA TESTING (password: 123456):';
PRINT '   • admin@demo.com -> Super Admin en TechCorp';
PRINT '   • manager@demo.com -> HR Manager en Consultores';
PRINT '   • user@demo.com -> HR Analyst en InnovaStart';
PRINT '   • viewer@demo.com -> Viewer en TechCorp';
PRINT '';
PRINT '🎭 USUARIO MULTI-TENANT: Pedro MultiOrg (multiuser@example.cl)';
PRINT '   • TechCorp Solutions: ROL VIEWER (permisos básicos)';
PRINT '   • Consultores & Asociados: ROL HR MANAGER (permisos altos)';
PRINT '   • InnovaStart: ROL SUPER ADMIN (permisos completos)';
PRINT '';
PRINT '🔐 SISTEMA DE PERMISOS:';
PRINT '   • 23 permisos × 3 organizaciones = 69 permisos totales';
PRINT '   • 5 roles × 3 organizaciones = 15 roles totales';
PRINT '   • Aislamiento completo por organización';
PRINT '';
PRINT '📄 DATOS ADICIONALES:';
PRINT '   • 6 procesos de CV (2 por organización)';
PRINT '   • 3 sesiones activas';
PRINT '   • Pedro MultiOrg actualmente en Consultores';
PRINT '';
PRINT '💡 CONCEPTO CLAVE DEMOSTRADO:';
PRINT '   ¡El mismo usuario puede tener diferentes roles';
PRINT '   y permisos en diferentes organizaciones!';
PRINT '';
PRINT '🧪 PARA PROBAR EL SISTEMA:';
PRINT '   1. Ejecuta: EXEC sp_get_user_permissions @multiuser_id, @org1_id';
PRINT '   2. Ejecuta: EXEC sp_get_user_permissions @multiuser_id, @org2_id';
PRINT '   3. Compara los diferentes permisos obtenidos';
PRINT '';
PRINT '==========================================';
GO


update users set password_hash = '$2b$10$faK/1XpBNQOkY8sgw8M3U.pmUtYxw8hGsV684cScQKRxIrGLJ588O'