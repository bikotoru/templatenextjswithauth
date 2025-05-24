'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import { RoleFrontendService } from '@/app/(module)/admin/roles/services/frontend.service';
import { RoleCreateRequest } from '@/app/(module)/admin/roles/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ArrowLeft, Save, Shield, Users, Key, Loader2, Plus, X, ChevronDown, ChevronRight, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import Link from 'next/link';

export default function CreateRolePage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<{ id: number; name: string; email: string; active: boolean }[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<{ id: number; permission_key: string; display_name: string; module: string }[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // Filters for permissions tab
  const [permissionSearch, setPermissionSearch] = useState('');
  const [showOnlySelectedPermissions, setShowOnlySelectedPermissions] = useState(false);
  
  // Permission state
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setInitialLoading(true);
      const [usersData, permissionsData] = await Promise.all([
        RoleFrontendService.getUsers(),
        RoleFrontendService.getPermissions()
      ]);
      
      setAvailableUsers(Array.isArray(usersData) ? usersData : []);
      setAvailablePermissions(Array.isArray(permissionsData) ? permissionsData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('El nombre del rol es requerido');
      return;
    }

    setLoading(true);

    try {
      const createData: RoleCreateRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        active: formData.active,
        userIds: Array.from(selectedUsers),
        permissionIds: Array.from(selectedPermissions),
      };

      const result = await RoleFrontendService.create(createData);
      toast.success('Rol creado exitosamente');
      router.push(`/admin/roles/${result.id}/edit?tab=users`);
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Error al crear rol');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = (userId: number) => {
    const newSelectedUsers = new Set(selectedUsers);
    newSelectedUsers.delete(userId);
    setSelectedUsers(newSelectedUsers);
  };

  // Función para cerrar modal de usuarios
  // const handleAddUsers = () => {
  //   setShowUserModal(false);
  //   toast.success(`${selectedUsers.size} usuarios agregados al rol`);
  // };

  const handlePermissionToggle = (permissionId: number, isChecked: boolean) => {
    const newSelectedPermissions = new Set(selectedPermissions);
    if (isChecked) {
      newSelectedPermissions.add(permissionId);
    } else {
      newSelectedPermissions.delete(permissionId);
    }
    
    setSelectedPermissions(newSelectedPermissions);
  };

  const toggleModule = (module: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(module)) {
      newExpanded.delete(module);
    } else {
      newExpanded.add(module);
    }
    setExpandedModules(newExpanded);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter and group permissions by module
  const getFilteredPermissionsByModule = () => {
    let filteredPermissions = availablePermissions;

    // Apply search filter
    if (permissionSearch.trim()) {
      const searchLower = permissionSearch.toLowerCase();
      filteredPermissions = filteredPermissions.filter(permission => 
        permission.display_name.toLowerCase().includes(searchLower) ||
        permission.permission_key.toLowerCase().includes(searchLower) ||
        permission.module.toLowerCase().includes(searchLower)
      );
    }

    // Group by module
    const grouped = filteredPermissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {} as Record<string, typeof availablePermissions>);

    // If showing only selected permissions, filter out modules with no selected permissions
    if (showOnlySelectedPermissions) {
      const filteredGrouped: Record<string, typeof availablePermissions> = {};
      
      Object.entries(grouped).forEach(([module, modulePermissions]) => {
        const moduleSelectedPermissions = modulePermissions.filter(permission => 
          selectedPermissions.has(permission.id)
        );
        
        if (moduleSelectedPermissions.length > 0) {
          filteredGrouped[module] = showOnlySelectedPermissions ? moduleSelectedPermissions : modulePermissions;
        }
      });
      
      return filteredGrouped;
    }

    return grouped;
  };

  const permissionsByModule = getFilteredPermissionsByModule();

  if (initialLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/roles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Roles
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Crear Nuevo Rol</h1>
            <p className="text-muted-foreground">
              Configure un nuevo rol con usuarios y permisos específicos
            </p>
          </div>
        </div>

        {/* Role Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Información del Rol
            </CardTitle>
            <CardDescription>
              Datos básicos del nuevo rol
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del rol *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ingresa el nombre del rol"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active">Rol activo</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del rol y sus responsabilidades"
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Crear Rol
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Users and Permissions Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios y Permisos</CardTitle>
            <CardDescription>
              Configure los usuarios que tendrán este rol y sus permisos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Usuarios ({selectedUsers.size})
                </TabsTrigger>
                <TabsTrigger value="permissions" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Permisos ({selectedPermissions.size})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Usuarios que tendrán este rol asignado
                  </p>
                </div>
                <div>
                  <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Usuarios
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Seleccionar Usuarios</DialogTitle>
                        <DialogDescription>
                          Selecciona los usuarios que tendrán este rol
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {availableUsers.map((user) => (
                            <div key={user.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                              <Checkbox
                                id={`modal-user-${user.id}`}
                                checked={selectedUsers.has(user.id)}
                                onCheckedChange={(checked) => {
                                  const newUsers = new Set(selectedUsers);
                                  if (checked) {
                                    newUsers.add(user.id);
                                  } else {
                                    newUsers.delete(user.id);
                                  }
                                  setSelectedUsers(newUsers);
                                }}
                              />
                              <div className="flex items-center space-x-3 flex-1">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                  <Label 
                                    htmlFor={`modal-user-${user.id}`} 
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {user.name}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowUserModal(false)}>
                            Cerrar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {(() => {
                    const selectedUserDetails = availableUsers.filter(user => selectedUsers.has(user.id));
                    return selectedUserDetails.length > 0 ? (
                      selectedUserDetails.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                          {!user.active && (
                            <Badge variant="secondary">Inactivo</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUser(user.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No hay usuarios seleccionados para este rol
                      </div>
                    );
                  })()}
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Permisos que otorgará este rol a los usuarios asignados.
                    </p>
                  </div>
                  
                  {/* Permission Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-muted/20">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar permisos o módulos..."
                          value={permissionSearch}
                          onChange={(e) => setPermissionSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-only-selected"
                        checked={showOnlySelectedPermissions}
                        onCheckedChange={setShowOnlySelectedPermissions}
                      />
                      <Label htmlFor="show-only-selected" className="text-sm whitespace-nowrap">
                        Solo permisos seleccionados
                      </Label>
                      <Filter className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* Results summary */}
                {(permissionSearch || showOnlySelectedPermissions) && (
                  <div className="text-sm text-muted-foreground">
                    {Object.keys(permissionsByModule).length === 0 ? (
                      <div className="text-center py-8">
                        <p>No se encontraron permisos que coincidan con los filtros.</p>
                        {(permissionSearch || showOnlySelectedPermissions) && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={() => {
                              setPermissionSearch('');
                              setShowOnlySelectedPermissions(false);
                            }}
                            className="mt-2"
                          >
                            Limpiar filtros
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p>
                        Mostrando {Object.keys(permissionsByModule).length} módulo(s) con{' '}
                        {Object.values(permissionsByModule).reduce((total, perms) => total + perms.length, 0)} permiso(s)
                        {permissionSearch && ` que coinciden con "${permissionSearch}"`}
                        {showOnlySelectedPermissions && ' seleccionados'}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                    <Collapsible
                      key={module}
                      open={expandedModules.has(module)}
                      onOpenChange={() => toggleModule(module)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          {expandedModules.has(module) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <Badge variant="outline" className="text-sm">
                            {module.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ({modulePermissions.length} permisos)
                          </span>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="mt-2 ml-6">
                        <div className="space-y-2">
                          {modulePermissions.map((permission) => {
                            const isSelected = selectedPermissions.has(permission.id);

                            return (
                              <div key={permission.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center space-x-3">
                                  <Switch
                                    checked={isSelected}
                                    onCheckedChange={(checked) => 
                                      handlePermissionToggle(permission.id, checked)
                                    }
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">
                                        {permission.display_name}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground font-mono">
                                      {permission.permission_key}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </DashboardLayout>
  );
}