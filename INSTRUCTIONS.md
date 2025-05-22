# Instrucciones de Desarrollo - Sistema Multi-Tenant

## Arquitectura Multi-Tenant

Este proyecto implementa un sistema multi-tenant robusto donde múltiples organizaciones pueden operar de forma independiente y segura en la misma aplicación.

### Conceptos Fundamentales

#### **1. Aislamiento por Organización**
- Cada dato pertenece a una organización específica mediante `organization_id`
- Los usuarios pueden pertenecer a múltiples organizaciones
- Los permisos y roles son específicos por organización
- El Super Admin puede acceder a cualquier organización

#### **2. Tabla `users` - Global**
La tabla `users` es la **ÚNICA tabla sin `organization_id`** porque los usuarios son entidades globales que pueden pertenecer a múltiples organizaciones a través de `user_organizations`.

#### **3. Campos Base Obligatorios**
**TODAS las tablas deben incluir estos campos base:**

```sql
-- CAMPOS BASE OBLIGATORIOS PARA TODAS LAS TABLAS

-- 1. CLAVE PRIMARIA (usar uno de estos patrones)
id INT IDENTITY(1,1) PRIMARY KEY,           -- Para tablas con ID numérico
-- O
id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),  -- Para tablas con GUID

-- 2. CAMPO DE ESTADO (obligatorio)
active BIT DEFAULT 1,                       -- Para soft delete

-- 3. CAMPOS DE AUDITORÍA (obligatorios)
organization_id UNIQUEIDENTIFIER NOT NULL, -- EXCEPTO tabla users
created_at DATETIME2 DEFAULT GETDATE(),
updated_at DATETIME2 DEFAULT GETDATE(),
created_by_id INT NOT NULL,                 -- FK a users.id (quien creó)
updated_by_id INT NOT NULL,                 -- FK a users.id (quien modificó)

-- 4. FOREIGN KEYS DE AUDITORÍA (obligatorias)
FOREIGN KEY (organization_id) REFERENCES organizations(id),  -- EXCEPTO tabla users
FOREIGN KEY (created_by_id) REFERENCES users(id),
FOREIGN KEY (updated_by_id) REFERENCES users(id),

-- 5. ÍNDICES OBLIGATORIOS
INDEX IX_[tabla]_active (active),
INDEX IX_[tabla]_organization_id (organization_id),  -- EXCEPTO tabla users
INDEX IX_[tabla]_created_at (created_at),
INDEX IX_[tabla]_updated_at (updated_at)
```

#### **4. Ejemplo de Tabla Completa**
```sql
CREATE TABLE ejemplo_tabla (
    -- Clave primaria
    id INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Campos específicos de la tabla
    nombre NVARCHAR(255) NOT NULL,
    descripcion NVARCHAR(500),
    
    -- Campo de estado obligatorio
    active BIT DEFAULT 1,
    
    -- Campos de auditoría obligatorios
    organization_id UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    
    -- Foreign keys obligatorias
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id),
    
    -- Índices obligatorios
    INDEX IX_ejemplo_tabla_active (active),
    INDEX IX_ejemplo_tabla_organization_id (organization_id),
    INDEX IX_ejemplo_tabla_created_at (created_at),
    INDEX IX_ejemplo_tabla_updated_at (updated_at),
    
    -- Índices específicos (según necesidad)
    INDEX IX_ejemplo_tabla_nombre (nombre)
);
```

### Estructura de Base de Datos

#### **Tablas Principales**

1. **`organizations`** - Organizaciones/Tenants
   - `id` (UNIQUEIDENTIFIER) - Clave primaria
   - `name`, `logo`, `rut` - Información básica
   - `active` - Para soft delete
   - Campos de auditoría

2. **`users`** - Usuarios Globales (SIN organization_id)
   - `id` (INT IDENTITY) - Clave primaria
   - `email`, `password_hash`, `name` - Información básica
   - `active` - Para soft delete
   - Campos de auditoría (sin organization_id)

3. **`user_organizations`** - Relación Many-to-Many
   - Conecta usuarios con organizaciones
   - Un usuario puede estar en múltiples organizaciones
   - Campos de auditoría

4. **`permissions`** - Permisos por Organización
   - `name` (ej: 'users:create', 'roles:edit')
   - `category` (ej: 'users', 'roles', 'system')
   - `system_hidden` - Para ocultar permisos del sistema
   - Campos de auditoría

5. **`roles`** - Roles por Organización con Tipos
   - `name` (ej: 'Admin', 'Manager')
   - `type` - Extensible: 'permissions', 'workflow', 'custom', 'system'
   - `system_hidden` - Para ocultar roles del sistema
   - Campos de auditoría

#### **Tablas de Asignación**

- **`role_permission_assignments`** - Qué permisos tiene cada rol
- **`user_role_assignments`** - Qué roles tiene cada usuario por organización
- **`user_permission_assignments`** - Permisos directos a usuarios
- **`user_sessions`** - Sesiones con organización activa
- **`activity_logs`** - Log de actividades por organización

### Sistema de Roles y Permisos

#### **Tipos de Roles (Extensible)**

```sql
type NVARCHAR(50) DEFAULT 'permissions'
```

- **`permissions`** - Roles normales de permisos (visible en UI)
- **`workflow`** - Roles de workflow (para futuro)
- **`custom`** - Roles personalizados (para futuro)
- **`system`** - Roles del sistema (ocultos)

#### **Flags de Visibilidad**

```sql
system_hidden BIT DEFAULT 0
```

- **`0`** - Visible en UI normal
- **`1`** - Oculto del sistema (Super Admin)

### Super Admin

#### **Características**
- Usuario especial que puede acceder a **cualquier organización**
- Tiene rol `type='system'` con `system_hidden=1`
- Permisos del sistema ocultos de la UI normal
- Puede crear organizaciones, usuarios, y gestionar el sistema

#### **Permisos del Super Admin**
```
system:manage
organizations:create
organizations:edit
organizations:deactivate
organizations:view_all
users:create_global
users:assign_organizations
users:manage_global
roles:manage_system
```

#### **Credenciales Iniciales**
```
Email: superadmin@system.local
Password: 123456 (cambiar en producción)
```

### Reglas de Desarrollo

#### **1. Consultas de Base de Datos**
```sql
-- ✅ CORRECTO - Siempre filtrar por organización
SELECT * FROM roles 
WHERE organization_id = @organization_id 
AND active = 1;

-- ❌ INCORRECTO - Sin filtro de organización
SELECT * FROM roles WHERE active = 1;
```

#### **2. Inserción de Datos**
```sql
-- ✅ CORRECTO - Incluir todos los campos de auditoría
INSERT INTO roles (name, description, organization_id, created_at, updated_at, created_by_id, updated_by_id)
VALUES (@name, @description, @organization_id, GETDATE(), GETDATE(), @user_id, @user_id);

-- ❌ INCORRECTO - Faltan campos de auditoría
INSERT INTO roles (name, description) VALUES (@name, @description);
```

#### **3. Vistas de Roles y Permisos**
```sql
-- Solo mostrar roles visibles
SELECT * FROM roles 
WHERE organization_id = @organization_id 
AND type = 'permissions' 
AND system_hidden = 0 
AND active = 1;

-- Solo mostrar permisos visibles
SELECT * FROM permissions 
WHERE organization_id = @organization_id 
AND system_hidden = 0 
AND active = 1;
```

#### **4. Detección de Super Admin**
```typescript
// Frontend - Detectar Super Admin
const isSuperAdmin = user?.roles?.includes('Super Admin') || 
                    user?.permissions?.includes('system:manage');

// Backend - Verificar Super Admin
const hasSuperAdminPermission = await hasPermission(userId, 'system:manage');
```

### Estructura de Módulos

```
app/(module)/[nombre-modulo]/
├── api/
│   ├── route.ts                    # Endpoints principales del módulo
│   └── [sub-endpoint]/
│       └── route.ts               # Sub-endpoints específicos
├── components/
│   ├── [component-name].tsx      # Componentes específicos del módulo
│   └── index.ts                  # Exportación de componentes
├── services/
│   ├── backend.service.ts        # Lógica de backend (queries, validaciones)
│   └── frontend.service.ts       # Lógica de frontend (llamadas API, estado)
└── types/
    └── index.ts                  # Tipos TypeScript del módulo
```

### Reglas de Desarrollo

#### **Creación de Tablas - OBLIGATORIO**

1. **Campos Base Obligatorios**: Toda nueva tabla DEBE incluir:
   ```sql
   -- Clave primaria
   id INT IDENTITY(1,1) PRIMARY KEY,
   
   -- Campo de estado (obligatorio)
   active BIT DEFAULT 1,
   
   -- Campos de auditoría (obligatorios)
   organization_id UNIQUEIDENTIFIER NOT NULL,  -- EXCEPTO tabla users
   created_at DATETIME2 DEFAULT GETDATE(),
   updated_at DATETIME2 DEFAULT GETDATE(),
   created_by_id INT NOT NULL,
   updated_by_id INT NOT NULL,
   
   -- Foreign keys (obligatorias)
   FOREIGN KEY (organization_id) REFERENCES organizations(id),  -- EXCEPTO tabla users
   FOREIGN KEY (created_by_id) REFERENCES users(id),
   FOREIGN KEY (updated_by_id) REFERENCES users(id),
   
   -- Índices (obligatorios)
   INDEX IX_[tabla]_active (active),
   INDEX IX_[tabla]_organization_id (organization_id),  -- EXCEPTO tabla users
   INDEX IX_[tabla]_created_at (created_at),
   INDEX IX_[tabla]_updated_at (updated_at)
   ```

2. **Trigger automático**: Crear trigger para `updated_at`:
   ```sql
   CREATE TRIGGER tr_[tabla]_update
   ON [tabla]
   AFTER UPDATE
   AS
   BEGIN
       UPDATE [tabla] 
       SET updated_at = GETDATE()
       WHERE id IN (SELECT id FROM inserted);
   END;
   ```

3. **Excepción única**: Solo la tabla `users` NO tiene `organization_id`

#### **Seguridad Multi-Tenant**

1. **Siempre filtrar por `organization_id`** en consultas (excepto tabla users)
2. **Validar acceso** a la organización antes de cualquier operación
3. **Nunca confiar** en datos del frontend para organization_id
4. **Usar stored procedures** para consultas complejas de permisos

#### **Campos de Auditoría**

1. **Actualizar `updated_by_id`** en cada modificación
2. **Registrar actividades** importantes en `activity_logs`
3. **Usar triggers** para `updated_at` automático
4. **Nunca eliminar datos** - usar soft delete con `active = 0`

#### **Validaciones en Backend**

1. **Verificar campos obligatorios**:
   ```typescript
   // Ejemplo en API endpoint
   if (!data.organization_id || !data.created_by_id) {
     return NextResponse.json({ 
       success: false, 
       error: 'Campos de auditoría requeridos' 
     }, { status: 400 });
   }
   ```

2. **Poblar campos automáticamente**:
   ```typescript
   // Siempre poblar desde el contexto del usuario
   const insertData = {
     ...userData,
     organization_id: user.currentOrganization.id,
     created_by_id: user.id,
     updated_by_id: user.id,
     created_at: new Date(),
     updated_at: new Date()
   };
   ```

3. **Validar estructura de tabla**:
   ```sql
   -- Verificar que una tabla cumple con los estándares
   SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
   FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_NAME = 'nombre_tabla' 
   AND COLUMN_NAME IN ('id', 'active', 'organization_id', 'created_at', 'updated_at', 'created_by_id', 'updated_by_id');
   ```

#### **Extensibilidad**

1. **Tipos de roles** preparados para futuras funcionalidades
2. **Flags de visibilidad** para ocultar elementos del sistema
3. **Categorías de permisos** para organización lógica
4. **Estructura modular** para agregar nuevas funcionalidades

### Flujo de Autenticación

1. **Login inicial** → Validar credenciales
2. **Múltiples organizaciones** → Mostrar selector
3. **Selección de organización** → Establecer contexto
4. **Cargar permisos** → Específicos de la organización
5. **Navegación** → Filtrada por permisos y organización

### Comandos de Inicialización

```sql
-- 1. Crear esquema
sqlcmd -S servidor -d basedatos -i schema.sql

-- 2. Crear Super Admin
sqlcmd -S servidor -d basedatos -i init-superadmin.sql
```

### Buenas Prácticas

#### **TypeScript**
```typescript
// Tipos base
interface BaseEntity {
  id: number;
  organization_id: string;
  created_at: Date;
  updated_at: Date;
  created_by_id: number;
  updated_by_id: number;
}

// Extender para entidades específicas
interface Role extends BaseEntity {
  name: string;
  description?: string;
  type: 'permissions' | 'workflow' | 'custom' | 'system';
  system_hidden: boolean;
  active: boolean;
}
```

#### **Componentes React**
```tsx
// Siempre verificar organización actual
const { currentOrganization } = useAuth();

// Filtrar datos por organización
const filteredData = data.filter(item => 
  item.organization_id === currentOrganization?.id
);
```

#### **APIs**
```typescript
// Validar acceso a organización
const hasAccess = await verifyOrganizationAccess(userId, organizationId);
if (!hasAccess) {
  return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
}
```

### Notas Importantes

- **Tabla `users`** es la única sin `organization_id`
- **Super Admin** puede cambiar a cualquier organización
- **Roles system** son invisibles en UI normal
- **Permisos system** son invisibles en UI normal
- **Auditoría completa** en todas las operaciones
- **Soft delete** en lugar de eliminación física
- **Extensibilidad** preparada para futuras funcionalidades