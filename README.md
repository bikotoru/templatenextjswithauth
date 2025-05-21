# NextJS Template - Sistema de Gestión con Autenticación

Una plantilla completa de Next.js con sistema de autenticación, gestión de usuarios, roles y permisos, conectada a SQL Server.

## 🚀 Características Principales

- ✅ **Autenticación completa** con JWT y cookies
- ✅ **Sistema de roles y permisos** granular
- ✅ **Dashboard con sidebar** responsive
- ✅ **Gestión de usuarios** CRUD completa
- ✅ **Arquitectura modular** escalable
- ✅ **Base de datos SQL Server** con procedimientos almacenados
- ✅ **UI moderna** con shadcn/ui y Tailwind CSS
- ✅ **TypeScript** para type safety
- ✅ **Componentes reutilizables** y bien documentados

## 📋 Prerrequisitos

- Node.js 18+ 
- SQL Server (local o remoto)
- npm o yarn

## 🔧 Instalación y Configuración

### 1. Clonar y configurar el proyecto

```bash
# Instalar dependencias
npm install

# O si prefieres yarn
yarn install
```

### 2. Configurar la base de datos

1. **Crear la base de datos en SQL Server:**
   ```sql
   CREATE DATABASE NextJSTemplate;
   ```

2. **Ejecutar el schema.sql:**
   ```bash
   # Ejecutar schema.sql en tu cliente SQL Server preferido
   # Este archivo crea todas las tablas, índices, triggers y procedimientos almacenados
   ```

3. **Cargar datos de demostración:**
   ```bash
   # Ejecutar demo.sql después del schema
   # Este archivo carga usuarios, roles y permisos de prueba
   ```

### 3. Configurar variables de entorno

Copia el archivo `.env.local` y configura tus credenciales de base de datos:

```env
# Database Configuration
DB_SERVER=localhost
DB_DATABASE=NextJSTemplate
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Authentication
JWT_SECRET=tu-clave-secreta-muy-segura-aqui
JWT_EXPIRES_IN=24h

# Application
NEXT_PUBLIC_APP_NAME=Tu App Name
NODE_ENV=development
```

### 4. Iniciar el servidor

```bash
npm run dev
# o
yarn dev
```

La aplicación estará disponible en `http://localhost:3000`

## 👤 Usuarios de Demostración

| Email | Password | Rol | Descripción |
|-------|----------|-----|-------------|
| `admin@admin.cl` | `123` | Super Admin | Acceso completo al sistema |
| `manager@demo.cl` | `manager123` | Manager | Gestión de usuarios y roles |
| `user@demo.cl` | `user123` | User | Usuario básico |
| `viewer@demo.cl` | `viewer123` | Viewer | Solo lectura |

## 🏗️ Arquitectura del Proyecto

### Estructura de Módulos

```
app/
├── (module)/
│   ├── auth/              # Módulo de autenticación
│   │   ├── api/          # Endpoints de auth
│   │   ├── components/   # Componentes de login
│   │   └── (pages)/      # Páginas de auth
│   ├── dashboard/        # Dashboard principal
│   ├── admin/           # Módulos de administración
│   │   └── users/       # Gestión de usuarios
│   └── cv-manager/      # Módulos existentes...
├── api/                 # Re-exports de APIs modulares
utils/
├── sql.ts              # Utilidades de base de datos
└── auth/               # Utilidades de autenticación
contexts/
└── auth-context.tsx    # Context de autenticación
```

### Principios de Desarrollo

1. **Modularidad**: Cada funcionalidad es un módulo independiente
2. **Separación de responsabilidades**: Backend/Frontend services separados
3. **Type Safety**: TypeScript en toda la aplicación
4. **Seguridad**: Validación de permisos en backend y frontend
5. **Escalabilidad**: Arquitectura preparada para crecer

## 🔒 Sistema de Permisos

### Estructura de Permisos

Los permisos siguen el formato: `módulo:acción`

Ejemplos:
- `users:view` - Ver usuarios
- `users:create` - Crear usuarios
- `roles:edit` - Editar roles
- `dashboard:view` - Ver dashboard

### Asignación de Permisos

Los permisos se pueden asignar de dos formas:
1. **Por roles**: Un usuario tiene roles, y los roles tienen permisos
2. **Directos**: Permisos asignados directamente al usuario

## 🛠️ Desarrollo

### Crear un Nuevo Módulo

1. **Crear estructura de directorios:**
   ```bash
   mkdir -p "app/(module)/mi-modulo/{api,(pages),components,services,types}"
   ```

2. **Definir tipos en `types/index.ts`**
3. **Crear backend service en `services/backend.service.ts`**
4. **Crear frontend service en `services/frontend.service.ts`**
5. **Implementar API routes en `api/route.ts`**
6. **Crear componentes en `components/`**
7. **Crear páginas en `(pages)/`**

Ver `INSTRUCTIONS.md` para detalles completos.

### Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npm run type-check
```

## 📊 Base de Datos

### Tablas Principales

- `users` - Información de usuarios
- `roles` - Definición de roles
- `permissions` - Catálogo de permisos
- `user_roles` - Relación usuario-rol
- `role_permissions` - Relación rol-permiso
- `user_permissions` - Permisos directos de usuario
- `user_sessions` - Sesiones activas
- `activity_logs` - Logs de actividad

### Procedimientos Almacenados

- `sp_get_user_permissions` - Obtiene todos los permisos de un usuario
- `sp_check_user_permission` - Verifica si un usuario tiene un permiso específico

## 🔧 Configuración Avanzada

### Personalizar Permisos

Edita `demo.sql` para agregar tus propios permisos:

```sql
INSERT INTO permissions (permission_key, display_name, description, module) VALUES
('mi_modulo:create', 'Crear en Mi Módulo', 'Permite crear elementos', 'mi_modulo');
```

### Configurar Nuevos Roles

```sql
INSERT INTO roles (name, description) VALUES
('Mi Rol', 'Descripción de mi rol personalizado');
```

## 🚀 Deployment

### Variables de Entorno de Producción

Asegúrate de configurar:
- `JWT_SECRET` - Una clave muy segura
- `DB_*` - Credenciales de producción de la base de datos
- `NODE_ENV=production`

### Build de Producción

```bash
npm run build
npm start
```

## 🤝 Contribución

1. Fork del proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes alguna pregunta o problema:

1. Revisa la documentación en `INSTRUCTIONS.md`
2. Verifica la configuración de base de datos
3. Revisa los logs en consola
4. Abre un issue en el repositorio

## 🔄 Roadmap

- [ ] Sistema de notificaciones
- [ ] Audit logs más detallados  
- [ ] API de reportes
- [ ] Sistema de configuración dinámico
- [ ] Integración con OAuth providers
- [ ] Sistema de backup automático

---

**¡Tu plantilla está lista para usar! 🎉**

Inicia con `npm run dev` y ve a `http://localhost:3000` para comenzar.