# Instrucciones de Desarrollo - Plantilla Next.js Modular

## Estructura del Proyecto

Este proyecto sigue una arquitectura modular donde cada funcionalidad está organizada de forma independiente y reutilizable.

### Estructura de Módulos

```
app/(module)/[nombre-modulo]/
├── api/
│   ├── route.ts                    # Endpoints principales del módulo
│   └── [sub-endpoint]/
│       └── route.ts               # Sub-endpoints específicos
├── (pages)/
│   ├── page.tsx                   # Página principal del módulo
│   └── [sub-page]/
│       └── page.tsx              # Sub-páginas
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

#### 1. Separación de Responsabilidades

- **Backend Service**: Maneja toda la lógica de base de datos, validaciones de servidor y reglas de negocio
- **Frontend Service**: Maneja llamadas a APIs, estado del cliente y transformaciones de datos
- **Components**: Solo se encargan de la presentación y interacción del usuario
- **API Routes**: Actúan como conectores entre el frontend y backend services

#### 2. Convenciones de Naming

- **Archivos**: kebab-case (`user-management.tsx`)
- **Componentes**: PascalCase (`UserManagement`)
- **Funciones**: camelCase (`getUserById`)
- **Constantes**: UPPER_SNAKE_CASE (`DEFAULT_PAGE_SIZE`)
- **Tipos**: PascalCase con sufijo Type (`UserType`, `RoleType`)

#### 3. Estructura de Base de Datos

- **Conexión**: Usar `utils/sql.ts` para todas las operaciones de BD
- **Queries**: Siempre usar parámetros para prevenir SQL Injection
- **Transacciones**: Usar para operaciones que afecten múltiples tablas

#### 4. Manejo de Errors

```typescript
// En backend services
try {
  const result = await executeQuery(query, params);
  return { success: true, data: result };
} catch (error) {
  return { success: false, error: error.message };
}

// En frontend services
const response = await fetch('/api/endpoint');
if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}
```

#### 5. Autenticación y Autorización

- **Permisos**: Formato `module:action` (ej: `users:create`, `roles:delete`)
- **Roles**: Pueden tener múltiples permisos asignados
- **Usuarios**: Pueden tener roles Y permisos directos
- **Validación**: Siempre validar permisos en backend antes de ejecutar acciones

## Base de Datos

### Configuración

1. **Variables de Entorno** (`.env.local`):
```env
DB_SERVER=localhost
DB_DATABASE=tu_base_datos
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
```

2. **Instalación Inicial**:
```bash
# Ejecutar schema.sql para crear las tablas
# Ejecutar demo.sql para insertar datos de prueba
```

### Uso de executeQuery

```typescript
import { executeQuery } from '@/utils/sql';

// Query simple
const users = await executeQuery('SELECT * FROM users WHERE active = @active', { active: true });

// Query con múltiples parámetros
const user = await executeQuery(
  'SELECT * FROM users WHERE email = @email AND password = @password',
  { email: 'admin@admin.cl', password: hashedPassword }
);

// Insert con retorno de ID
const result = await executeQuery(
  'INSERT INTO users (email, password, name) OUTPUT INSERTED.id VALUES (@email, @password, @name)',
  { email, password, name }
);
```

## Desarrollo de Nuevos Módulos

### Paso 1: Crear Estructura
```bash
mkdir -p app/\(module\)/[nombre-modulo]/\{api,\(pages\),components,services,types\}
```

### Paso 2: Definir Tipos
```typescript
// types/index.ts
export interface [Nombre]Type {
  id: number;
  // ... otros campos
  createdAt: Date;
  updatedAt: Date;
}

export interface [Nombre]CreateRequest {
  // campos necesarios para crear
}

export interface [Nombre]UpdateRequest {
  // campos necesarios para actualizar
}
```

### Paso 3: Backend Service
```typescript
// services/backend.service.ts
import { executeQuery } from '@/utils/sql';

export class [Nombre]BackendService {
  static async getAll() {
    return executeQuery('SELECT * FROM [tabla] WHERE active = 1');
  }

  static async getById(id: number) {
    return executeQuery('SELECT * FROM [tabla] WHERE id = @id', { id });
  }

  static async create(data: [Nombre]CreateRequest) {
    return executeQuery(
      'INSERT INTO [tabla] (...) OUTPUT INSERTED.* VALUES (...)',
      data
    );
  }

  static async update(id: number, data: [Nombre]UpdateRequest) {
    return executeQuery(
      'UPDATE [tabla] SET ... WHERE id = @id',
      { ...data, id }
    );
  }

  static async delete(id: number) {
    return executeQuery(
      'UPDATE [tabla] SET active = 0 WHERE id = @id',
      { id }
    );
  }
}
```

### Paso 4: API Routes
```typescript
// api/route.ts
import { [Nombre]BackendService } from '../services/backend.service';

export async function GET() {
  try {
    const result = await [Nombre]BackendService.getAll();
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = await [Nombre]BackendService.create(data);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Paso 5: Frontend Service
```typescript
// services/frontend.service.ts
export class [Nombre]FrontendService {
  static async getAll() {
    const response = await fetch('/api/[nombre-modulo]');
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  }

  static async create(data: [Nombre]CreateRequest) {
    const response = await fetch('/api/[nombre-modulo]', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create');
    return response.json();
  }
}
```

## Testing

- Usar Jest para unit tests
- Usar React Testing Library para component tests
- Crear mocks para servicios de base de datos
- Mantener cobertura > 80%

## Deployment

1. Configurar variables de entorno en producción
2. Ejecutar scripts de base de datos
3. Ejecutar `npm run build`
4. Verificar conexión a base de datos

## Buenas Prácticas

1. **Validación**: Validar datos tanto en frontend como backend
2. **Seguridad**: Nunca exponer credenciales en código
3. **Performance**: Usar React.memo para componentes pesados
4. **Accesibilidad**: Seguir estándares WCAG 2.1
5. **Código Limpio**: Funciones pequeñas, nombres descriptivos
6. **Documentación**: Comentar lógica compleja, mantener README actualizado