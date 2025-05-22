'use client';

import { useAuth } from '@/contexts/auth-context';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Shield, 
  Key, 
  Settings,
  ArrowRight,
  Database,
  Activity,
  Building2
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const { user, hasPermission } = useAuth();

  const adminModules = [
    {
      title: 'Gestión de Usuarios',
      description: 'Crear, editar y gestionar usuarios del sistema',
      icon: Users,
      href: '/admin/users',
      permission: 'users:view',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Gestión de Roles',
      description: 'Definir y configurar roles con permisos específicos',
      icon: Shield,
      href: '/admin/roles',
      permission: 'roles:view',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Gestión de Permisos',
      description: 'Ver y organizar todos los permisos del sistema',
      icon: Key,
      href: '/admin/permissions',
      permission: 'permissions:view',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Gestión de Organizaciones',
      description: 'Administrar organizaciones del sistema',
      icon: Building2,
      href: '/admin/organizations',
      permission: 'organizations:view_all',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  const systemStats = [
    {
      title: 'Base de Datos',
      description: 'SQL Server conectado correctamente',
      icon: Database,
      status: 'Conectado',
      statusColor: 'bg-green-100 text-green-700',
    },
    {
      title: 'Sistema de Autenticación',
      description: 'JWT con persistencia en base de datos',
      icon: Activity,
      status: 'Activo',
      statusColor: 'bg-green-100 text-green-700',
    },
    {
      title: 'Arquitectura Modular',
      description: 'Sistema diseñado para escalabilidad horizontal',
      icon: Settings,
      status: 'Configurado',
      statusColor: 'bg-blue-100 text-blue-700',
    },
  ];

  const availableModules = adminModules.filter(module => 
    !module.permission || hasPermission(module.permission)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-600 mt-2">
            Gestiona usuarios, roles y permisos del sistema desde un lugar centralizado
          </p>
        </div>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Información del Administrador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Usuario:</span>
                <p className="text-lg font-semibold">{user?.name}</p>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Roles Asignados:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {user?.roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Permisos Activos:</span>
                <p className="text-lg font-semibold">{user?.permissions.length || 0} permisos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Modules */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Módulos de Administración</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableModules.map((module) => (
              <Card key={module.href} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${module.bgColor}`}>
                      <module.icon className={`h-6 w-6 ${module.color}`} />
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={module.href}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={module.href}>
                      Acceder al Módulo
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Estado del Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {systemStats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <stat.icon className="h-8 w-8 text-gray-600" />
                    <Badge className={stat.statusColor}>
                      {stat.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{stat.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>
              Acceso directo a funciones administrativas frecuentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {hasPermission('users:create') && (
                <Button variant="outline" asChild>
                  <Link href="/admin/users" className="h-auto p-4 flex flex-col items-center gap-2">
                    <Users className="h-6 w-6" />
                    <span className="text-sm">Crear Usuario</span>
                  </Link>
                </Button>
              )}
              
              {hasPermission('roles:create') && (
                <Button variant="outline" asChild>
                  <Link href="/admin/roles" className="h-auto p-4 flex flex-col items-center gap-2">
                    <Shield className="h-6 w-6" />
                    <span className="text-sm">Crear Rol</span>
                  </Link>
                </Button>
              )}
              
              {hasPermission('permissions:view') && (
                <Button variant="outline" asChild>
                  <Link href="/admin/permissions" className="h-auto p-4 flex flex-col items-center gap-2">
                    <Key className="h-6 w-6" />
                    <span className="text-sm">Ver Permisos</span>
                  </Link>
                </Button>
              )}
              
              {hasPermission('dashboard:analytics') && (
                <Button variant="outline" asChild>
                  <Link href="/dashboard" className="h-auto p-4 flex flex-col items-center gap-2">
                    <Activity className="h-6 w-6" />
                    <span className="text-sm">Analytics</span>
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}