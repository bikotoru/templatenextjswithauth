'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import { UserFrontendService } from '@/app/(module)/admin/users/services/frontend.service';
import { UserUpdateRequest, UserType } from '@/app/(module)/admin/users/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import { ArrowLeft, Save, User, Shield, Key, Loader2, Plus, X, ChevronDown, ChevronRight, Lock, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import Link from 'next/link';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [user, setUser] = useState<UserType | null>(null);
  const [availableRoles, setAvailableRoles] = useState<{ id: number; name: string; description?: string }[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<{ id: number; permission_key: string; display_name: string; module: string }[]>([]);
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    avatar: '',
    active: true,
  });

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRolesForModal, setSelectedRolesForModal] = useState<Set<number>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // Filters for permissions tab
  const [permissionSearch, setPermissionSearch] = useState('');
  const [showOnlyUserPermissions, setShowOnlyUserPermissions] = useState(false);
  
  // Temporary permission state for editing
  const [tempPermissions, setTempPermissions] = useState<Set<number>>(new Set());
  const [hasPermissionChanges, setHasPermissionChanges] = useState(false);
  const [showPermissionConfirmModal, setShowPermissionConfirmModal] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserAndData();
    }
  }, [userId]);

  const fetchUserAndData = async () => {
    try {
      setInitialLoading(true);
      const [userData, rolesData, permissionsData] = await Promise.all([
        UserFrontendService.getById(userId),
        UserFrontendService.getRoles(),
        UserFrontendService.getPermissions()
      ]);
      
      setUser(userData);
      setAvailableRoles(Array.isArray(rolesData) ? rolesData : []);
      setAvailablePermissions(Array.isArray(permissionsData) ? permissionsData : []);
      
      // Pre-populate form with user data
      setFormData({
        email: userData.email,
        name: userData.name,
        avatar: userData.avatar || '',
        active: userData.active,
      });

      // Set selected roles for modal
      setSelectedRolesForModal(new Set(userData.role_ids || []));
      
      // Initialize temp permissions with current user permissions
      setTempPermissions(new Set(userData.permission_ids || []));
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Error al cargar datos del usuario');
      router.push('/admin/users');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: UserUpdateRequest = {
        email: formData.email,
        name: formData.name,
        avatar: formData.avatar || undefined,
        active: formData.active,
      };

      await UserFrontendService.update(userId, updateData);
      toast.success('Usuario actualizado exitosamente');
      // Refresh user data
      await fetchUserAndData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (roleId: number) => {
    if (!user) return;
    
    try {
      const newRoleIds = user.role_ids?.filter(id => id !== roleId) || [];
      await UserFrontendService.update(userId, { roleIds: newRoleIds });
      toast.success('Rol removido exitosamente');
      await fetchUserAndData();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Error al remover rol');
    }
  };

  const handleAddRoles = async () => {
    try {
      const newRoleIds = Array.from(selectedRolesForModal);
      await UserFrontendService.update(userId, { roleIds: newRoleIds });
      toast.success('Roles actualizados exitosamente');
      setShowRoleModal(false);
      await fetchUserAndData();
    } catch (error) {
      console.error('Error updating roles:', error);
      toast.error('Error al actualizar roles');
    }
  };

  const handlePermissionToggle = (permissionId: number, isChecked: boolean) => {
    if (!user) return;

    // Check if permission is inherited (cannot be toggled)
    if (user.inherited_permissions?.includes(permissionId)) {
      toast.error('No puedes modificar permisos heredados de roles');
      return;
    }

    const newTempPermissions = new Set(tempPermissions);
    if (isChecked) {
      newTempPermissions.add(permissionId);
    } else {
      newTempPermissions.delete(permissionId);
    }
    
    setTempPermissions(newTempPermissions);
    
    // Check if there are changes compared to original
    const originalPermissions = new Set(user.permission_ids || []);
    const hasChanges = 
      newTempPermissions.size !== originalPermissions.size ||
      [...newTempPermissions].some(id => !originalPermissions.has(id)) ||
      [...originalPermissions].some(id => !newTempPermissions.has(id));
    
    setHasPermissionChanges(hasChanges);
  };

  const handleSavePermissions = () => {
    if (!user || !hasPermissionChanges) return;
    setShowPermissionConfirmModal(true);
  };

  const confirmSavePermissions = async () => {
    if (!user) return;

    try {
      const newPermissionIds = Array.from(tempPermissions);
      await UserFrontendService.update(userId, { permissionIds: newPermissionIds });
      toast.success('Permisos actualizados exitosamente');
      setHasPermissionChanges(false);
      setShowPermissionConfirmModal(false);
      await fetchUserAndData();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Error al actualizar permisos');
    }
  };

  const discardPermissionChanges = () => {
    if (!user) return;
    setTempPermissions(new Set(user.permission_ids || []));
    setHasPermissionChanges(false);
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

    // If showing only user permissions, filter out modules with no user permissions
    if (showOnlyUserPermissions && user) {
      const filteredGrouped: Record<string, typeof availablePermissions> = {};
      
      Object.entries(grouped).forEach(([module, modulePermissions]) => {
        const moduleUserPermissions = modulePermissions.filter(permission => {
          const isInherited = user.inherited_permissions?.includes(permission.id) || false;
          const isDirectlyAssigned = tempPermissions.has(permission.id) || false;
          return isInherited || isDirectlyAssigned;
        });
        
        if (moduleUserPermissions.length > 0) {
          filteredGrouped[module] = showOnlyUserPermissions ? moduleUserPermissions : modulePermissions;
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
            <p className="text-muted-foreground">Cargando datos del usuario...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Usuario no encontrado</p>
            <Button asChild>
              <Link href="/admin/users">Volver a Usuarios</Link>
            </Button>
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
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Usuarios
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editar Usuario</h1>
            <p className="text-muted-foreground">
              Actualizando información de: <span className="font-medium">{user.name}</span>
            </p>
          </div>
        </div>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Datos básicos del usuario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ingresa el nombre completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@ejemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar URL (opcional)</Label>
                <Input
                  id="avatar"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="https://ejemplo.com/avatar.jpg"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Usuario activo</Label>
              </div>
              
              {/* User Info */}
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><span className="font-medium">ID:</span> {user.id}</p>
                  <p><span className="font-medium">Creado:</span> {new Date(user.created_at).toLocaleDateString('es-ES')}</p>
                  {user.last_login && (
                    <p><span className="font-medium">Último login:</span> {new Date(user.last_login).toLocaleDateString('es-ES')}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Actualizar Información
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Roles and Permissions Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Roles y Permisos</CardTitle>
            <CardDescription>
              Gestiona los roles y permisos del usuario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="roles" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="roles" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Roles
                </TabsTrigger>
                <TabsTrigger value="permissions" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Permisos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="roles" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Roles asignados al usuario
                  </p>
                  <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Roles
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Seleccionar Roles</DialogTitle>
                        <DialogDescription>
                          Selecciona los roles que tendrá este usuario
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {availableRoles.map((role) => (
                            <div key={role.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                              <Checkbox
                                id={`modal-role-${role.id}`}
                                checked={selectedRolesForModal.has(role.id)}
                                onCheckedChange={(checked) => {
                                  const newRoles = new Set(selectedRolesForModal);
                                  if (checked) {
                                    newRoles.add(role.id);
                                  } else {
                                    newRoles.delete(role.id);
                                  }
                                  setSelectedRolesForModal(newRoles);
                                }}
                              />
                              <div className="flex-1 space-y-1">
                                <Label 
                                  htmlFor={`modal-role-${role.id}`} 
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {role.name}
                                </Label>
                                {role.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {role.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowRoleModal(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleAddRoles}>
                            Aplicar Cambios
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {user.role_details && user.role_details.length > 0 ? (
                    user.role_details.map((role) => (
                      <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{role.name}</div>
                          {role.description && (
                            <div className="text-sm text-muted-foreground">{role.description}</div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRole(role.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay roles asignados
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Permisos agrupados por módulo. Los permisos con <Lock className="h-3 w-3 inline" /> son heredados de roles y no se pueden modificar.
                    </p>
                    {hasPermissionChanges && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={discardPermissionChanges}
                        >
                          Descartar Cambios
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleSavePermissions}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Permisos
                        </Button>
                      </div>
                    )}
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
                        id="show-only-user"
                        checked={showOnlyUserPermissions}
                        onCheckedChange={setShowOnlyUserPermissions}
                      />
                      <Label htmlFor="show-only-user" className="text-sm whitespace-nowrap">
                        Solo permisos del usuario
                      </Label>
                      <Filter className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* Results summary */}
                {(permissionSearch || showOnlyUserPermissions) && (
                  <div className="text-sm text-muted-foreground">
                    {Object.keys(permissionsByModule).length === 0 ? (
                      <div className="text-center py-8">
                        <p>No se encontraron permisos que coincidan con los filtros.</p>
                        {(permissionSearch || showOnlyUserPermissions) && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={() => {
                              setPermissionSearch('');
                              setShowOnlyUserPermissions(false);
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
                        {showOnlyUserPermissions && ' del usuario'}
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
                            const isInherited = user.inherited_permissions?.includes(permission.id) || false;
                            const isDirectlyAssigned = tempPermissions.has(permission.id) || false;
                            
                            // For inherited permissions, show as checked but disabled
                            // For direct permissions, show based on temp state and allow toggle
                            const switchChecked = isInherited || isDirectlyAssigned;
                            const switchDisabled = isInherited;

                            return (
                              <div key={permission.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center space-x-3">
                                  <Switch
                                    checked={switchChecked}
                                    disabled={switchDisabled}
                                    onCheckedChange={(checked) => 
                                      handlePermissionToggle(permission.id, checked)
                                    }
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">
                                        {permission.display_name}
                                      </span>
                                      {isInherited && (
                                        <Lock className="h-3 w-3 text-muted-foreground" />
                                      )}
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

      {/* Permission Confirmation Modal */}
      <Dialog open={showPermissionConfirmModal} onOpenChange={setShowPermissionConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Cambios de Permisos</DialogTitle>
            <DialogDescription>
              Revisa los cambios que se aplicarán a los permisos del usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              if (!user) return null;
              
              // Get the original direct permissions (not inherited ones)
              const originalDirectPermissions = new Set(user.permission_ids || []);
              const newDirectPermissions = tempPermissions;
              
              // Only compare direct permissions that the user actually has assigned
              const toAdd = [...newDirectPermissions].filter(id => !originalDirectPermissions.has(id));
              const toRemove = [...originalDirectPermissions].filter(id => !newDirectPermissions.has(id));
              
              const permissionsToAdd = availablePermissions.filter(p => toAdd.includes(p.id));
              const permissionsToRemove = availablePermissions.filter(p => toRemove.includes(p.id));
              
              return (
                <div className="space-y-4">
                  {permissionsToAdd.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">
                        ✅ Permisos a agregar ({permissionsToAdd.length}):
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {permissionsToAdd.map(permission => (
                          <div key={permission.id} className="text-sm p-2 bg-green-50 rounded">
                            <div className="font-medium">{permission.display_name}</div>
                            <div className="text-xs text-muted-foreground">{permission.permission_key}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {permissionsToRemove.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-700 mb-2">
                        ❌ Permisos a eliminar ({permissionsToRemove.length}):
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {permissionsToRemove.map(permission => (
                          <div key={permission.id} className="text-sm p-2 bg-red-50 rounded">
                            <div className="font-medium">{permission.display_name}</div>
                            <div className="text-xs text-muted-foreground">{permission.permission_key}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {toAdd.length === 0 && toRemove.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground mb-2">No hay cambios para aplicar</p>
                      <p className="text-xs text-muted-foreground">
                        Los permisos directos del usuario permanecerán igual
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPermissionConfirmModal(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmSavePermissions}>
                Confirmar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </DashboardLayout>
  );
}