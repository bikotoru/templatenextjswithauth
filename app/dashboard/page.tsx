'use client';

import { useAuth } from '@/contexts/auth-context';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Shield, 
  Key, 
  Activity,
  TrendingUp,
  FileText,
  MessageSquare,
  Calendar
} from 'lucide-react';

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();

  const stats = [
    {
      title: 'Usuarios Activos',
      value: '142',
      description: 'Usuarios registrados en el sistema',
      icon: Users,
      permission: 'users:view',
    },
    {
      title: 'Roles Definidos',
      value: '5',
      description: 'Roles configurados',
      icon: Shield,
      permission: 'roles:view',
    },
    {
      title: 'Permisos',
      value: '28',
      description: 'Permisos disponibles',
      icon: Key,
      permission: 'permissions:view',
    },
    {
      title: 'CVs Procesados',
      value: '89',
      description: 'Currículums gestionados',
      icon: FileText,
      permission: 'cv:view',
    },
  ];

  const recentActivity = [
    {
      action: 'Nuevo usuario registrado',
      user: 'juan.perez@email.com',
      time: 'Hace 5 minutos',
      type: 'user',
    },
    {
      action: 'CV procesado exitosamente',
      user: 'maria.garcia@email.com',
      time: 'Hace 12 minutos',
      type: 'cv',
    },
    {
      action: 'Rol actualizado',
      user: 'admin@admin.cl',
      time: 'Hace 1 hora',
      type: 'role',
    },
    {
      action: 'Sesión iniciada',
      user: 'carlos.lopez@email.com',
      time: 'Hace 2 horas',
      type: 'auth',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users className="h-4 w-4" />;
      case 'cv': return <FileText className="h-4 w-4" />;
      case 'role': return <Shield className="h-4 w-4" />;
      case 'auth': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-blue-100 text-blue-700';
      case 'cv': return 'bg-green-100 text-green-700';
      case 'role': return 'bg-purple-100 text-purple-700';
      case 'auth': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ¡Bienvenido, {user?.name}!
              </h1>
              <p className="text-gray-600 mt-1">
                Aquí tienes un resumen de la actividad del sistema
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {user?.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            if (stat.permission && !hasPermission(stat.permission)) {
              return null;
            }

            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Actividad Reciente
              </CardTitle>
              <CardDescription>
                Últimas acciones realizadas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.user}
                      </p>
                      <p className="text-xs text-gray-400">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Acceso Rápido
              </CardTitle>
              <CardDescription>
                Acciones frecuentes del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {hasPermission('users:create') && (
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <Users className="h-6 w-6 text-blue-600 mb-2" />
                    <h3 className="font-medium text-sm">Crear Usuario</h3>
                    <p className="text-xs text-gray-500">Añadir nuevo usuario</p>
                  </div>
                )}
                
                {hasPermission('cv:create') && (
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <FileText className="h-6 w-6 text-green-600 mb-2" />
                    <h3 className="font-medium text-sm">Subir CV</h3>
                    <p className="text-xs text-gray-500">Procesar currículum</p>
                  </div>
                )}
                
                {hasPermission('roles:create') && (
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <Shield className="h-6 w-6 text-purple-600 mb-2" />
                    <h3 className="font-medium text-sm">Crear Rol</h3>
                    <p className="text-xs text-gray-500">Definir nuevo rol</p>
                  </div>
                )}
                
                {hasPermission('cv:chat') && (
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <MessageSquare className="h-6 w-6 text-orange-600 mb-2" />
                    <h3 className="font-medium text-sm">CV Chat</h3>
                    <p className="text-xs text-gray-500">Interactuar con CV</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Información del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Usuario Actual:</strong> {user?.email}
              </div>
              <div>
                <strong>Permisos:</strong> {user?.permissions.length} asignados
              </div>
              <div>
                <strong>Última Conexión:</strong> Ahora
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}