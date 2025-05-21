'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

interface Permission {
  id: number;
  permission_key: string;
  display_name: string;
  description?: string;
  module: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [modules, setModules] = useState<string[]>([]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/permissions');
      const data = await response.json();
      
      if (data.success) {
        setPermissions(data.data);
        
        // Extract unique modules
        const uniqueModules = [...new Set(data.data.map((p: Permission) => p.module))] as string[];
        setModules(uniqueModules);
      } else {
        toast.error('Error al cargar permisos');
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Error al cargar permisos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = !searchTerm || 
      permission.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.permission_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (permission.description && permission.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesModule = !selectedModule || selectedModule === 'all_modules' || permission.module === selectedModule;
    
    return matchesSearch && matchesModule;
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Group permissions by module for better display
  const permissionsByModule = filteredPermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Gestión de Permisos</h2>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar permisos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_modules">Todos los módulos</SelectItem>
              {modules.map((module) => (
                <SelectItem key={module} value={module}>
                  {module}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold">{permissions.length}</div>
            <div className="text-sm text-muted-foreground">Total de Permisos</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold">{modules.length}</div>
            <div className="text-sm text-muted-foreground">Módulos</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold">{filteredPermissions.length}</div>
            <div className="text-sm text-muted-foreground">Permisos Filtrados</div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Cargando permisos...</p>
          </div>
        ) : selectedModule || searchTerm ? (
          // Table view when filtering
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Clave</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No se encontraron permisos</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPermissions.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell className="font-medium">{permission.display_name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {permission.permission_key}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={permission.description}>
                          {permission.description || <span className="text-muted-foreground">Sin descripción</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{permission.module}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={permission.active ? "default" : "secondary"}>
                          {permission.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(permission.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          // Grouped view by default
          <div className="space-y-6">
            {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
              <div key={module} className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold capitalize">{module}</h3>
                  <Badge variant="outline">
                    {modulePermissions.length} permisos
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modulePermissions.map((permission) => (
                    <div key={permission.id} className="p-4 border rounded-lg hover:bg-muted/50">
                      <div className="font-medium text-sm mb-1">{permission.display_name}</div>
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded block mb-2">
                        {permission.permission_key}
                      </code>
                      {permission.description && (
                        <p className="text-xs text-muted-foreground">{permission.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Toaster />
    </DashboardLayout>
  );
}