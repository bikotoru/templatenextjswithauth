'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  Users, 
  Shield, 
  Calendar, 
  Activity,
  TrendingUp,
  Database,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface OrganizationStats {
  userStats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersJoinedThisMonth: number;
    usersJoinedThisWeek: number;
  };
  roleStats: {
    totalRoles: number;
    mostAssignedRole: string | null;
    averageRolesPerUser: number;
  };
  activityStats: {
    totalLogins: number;
    loginsThisMonth: number;
    loginsThisWeek: number;
    lastActivityDate: string | null;
    mostActiveUser: string | null;
  };
  systemStats: {
    organizationAge: number; // días desde creación
    createdAt: string;
    isExpired: boolean;
    expiresAt: string | null;
    daysUntilExpiration: number | null;
  };
}

interface OrganizationStatsProps {
  organizationId: string;
  organizationName: string;
}

export default function OrganizationStats({ organizationId, organizationName }: OrganizationStatsProps) {
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/organizations/${organizationId}/stats`);
      
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }
      
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching organization stats:', error);
      toast.error('Error al cargar las estadísticas de la organización');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [organizationId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getExpirationStatus = () => {
    if (!stats?.systemStats.expiresAt) {
      return { text: 'Nunca expira', variant: 'default' as const, icon: Calendar };
    }
    
    if (stats.systemStats.isExpired) {
      return { text: 'Expirada', variant: 'destructive' as const, icon: AlertTriangle };
    }
    
    const daysLeft = stats.systemStats.daysUntilExpiration;
    if (daysLeft && daysLeft <= 30) {
      return { text: `Expira en ${daysLeft} días`, variant: 'outline' as const, icon: Clock };
    }
    
    return { text: `Expira el ${formatDate(stats.systemStats.expiresAt)}`, variant: 'secondary' as const, icon: Calendar };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar las estadísticas de la organización.
        </AlertDescription>
      </Alert>
    );
  }

  const expirationStatus = getExpirationStatus();
  const ExpirationIcon = expirationStatus.icon;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.userStats.activeUsers} activos, {stats.userStats.inactiveUsers} inactivos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles Asignados</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.roleStats.totalRoles}</div>
            <p className="text-xs text-muted-foreground">
              {stats.roleStats.averageRolesPerUser.toFixed(1)} promedio por usuario
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividad</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activityStats.totalLogins}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activityStats.loginsThisMonth} este mes
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Días de Vida</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.systemStats.organizationAge}</div>
            <p className="text-xs text-muted-foreground">
              Desde {formatDate(stats.systemStats.createdAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Crecimiento de Usuarios
            </CardTitle>
            <CardDescription>
              Nuevos usuarios registrados recientemente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Esta semana</span>
                <span>{stats.userStats.usersJoinedThisWeek} usuarios</span>
              </div>
              <Progress 
                value={stats.userStats.usersJoinedThisWeek} 
                max={stats.userStats.usersJoinedThisMonth || 1}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Este mes</span>
                <span>{stats.userStats.usersJoinedThisMonth} usuarios</span>
              </div>
              <Progress 
                value={stats.userStats.usersJoinedThisMonth} 
                max={stats.userStats.totalUsers || 1}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Distribución de Roles
            </CardTitle>
            <CardDescription>
              Información sobre asignación de roles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Rol más asignado:</span>
              <Badge variant="secondary">
                {stats.roleStats.mostAssignedRole || 'N/A'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Promedio de roles:</span>
              <span className="font-medium">
                {stats.roleStats.averageRolesPerUser.toFixed(1)} por usuario
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Total asignaciones:</span>
              <span className="font-medium">{stats.roleStats.totalRoles}</span>
            </div>
          </CardContent>
        </Card>

        {/* Activity Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
            <CardDescription>
              Estadísticas de uso y acceso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">{stats.activityStats.loginsThisWeek}</p>
                <p className="text-xs text-muted-foreground">Logins esta semana</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activityStats.loginsThisMonth}</p>
                <p className="text-xs text-muted-foreground">Logins este mes</p>
              </div>
            </div>
            {stats.activityStats.mostActiveUser && (
              <div className="flex justify-between items-center">
                <span className="text-sm">Usuario más activo:</span>
                <Badge variant="outline">
                  {stats.activityStats.mostActiveUser}
                </Badge>
              </div>
            )}
            {stats.activityStats.lastActivityDate && (
              <div className="flex justify-between items-center">
                <span className="text-sm">Última actividad:</span>
                <span className="text-sm">
                  {formatDate(stats.activityStats.lastActivityDate)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Información del Sistema
            </CardTitle>
            <CardDescription>
              Detalles técnicos y configuración
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Estado de expiración:</span>
              <Badge variant={expirationStatus.variant} className="flex items-center gap-1">
                <ExpirationIcon className="h-3 w-3" />
                {expirationStatus.text}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Fecha de creación:</span>
              <span className="text-sm">
                {formatDate(stats.systemStats.createdAt)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Días de operación:</span>
              <span className="font-medium">{stats.systemStats.organizationAge} días</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Ratio activos/total:</span>
              <span className="font-medium">
                {stats.userStats.totalUsers > 0 
                  ? ((stats.userStats.activeUsers / stats.userStats.totalUsers) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}