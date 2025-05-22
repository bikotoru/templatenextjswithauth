'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import { RoleFrontendService } from '@/app/(module)/admin/roles/services/frontend.service';
import { RoleUpdateRequest, RoleType } from '@/app/(module)/admin/roles/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const roleId = parseInt(params.id as string);
  
  // Get tab from URL params
  const [searchParams, setSearchParams] = useState(new URLSearchParams());
  const [defaultTab, setDefaultTab] = useState('users');
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [role, setRole] = useState<RoleType | null>(null);
  const [availableUsers, setAvailableUsers] = useState<{ id: number; name: string; email: string; active: boolean }[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<{ id: number; permission_key: string; display_name: string; module: string }[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUsersForModal, setSelectedUsersForModal] = useState<Set<number>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // Filters for permissions tab
  const [permissionSearch, setPermissionSearch] = useState('');
  const [showOnlyRolePermissions, setShowOnlyRolePermissions] = useState(false);
  
  // Temporary permission state for editing
  const [tempPermissions, setTempPermissions] = useState<Set<number>>(new Set());
  const [hasPermissionChanges, setHasPermissionChanges] = useState(false);
  const [showPermissionConfirmModal, setShowPermissionConfirmModal] = useState(false);
  
  // Temporary user state for editing
  const [tempUsers, setTempUsers] = useState<Set<number>>(new Set());
  const [hasUserChanges, setHasUserChanges] = useState(false);
  const [showUserConfirmModal, setShowUserConfirmModal] = useState(false);

  useEffect(() => {
    // Check URL params for tab
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'permissions') {
      setDefaultTab('permissions');
    }
    setSearchParams(urlParams);
  }, []);

  useEffect(() => {
    if (roleId) {
      fetchRoleAndData();
    }
  }, [roleId]);

  const fetchRoleAndData = async () => {
    try {
      setInitialLoading(true);
      const [roleData, usersData, permissionsData] = await Promise.all([
        RoleFrontendService.getById(roleId),
        RoleFrontendService.getUsers(),
        RoleFrontendService.getPermissions()
      ]);
      
      setRole(roleData);
      setAvailableUsers(Array.isArray(usersData) ? usersData : []);
      setAvailablePermissions(Array.isArray(permissionsData) ? permissionsData : []);
      
      // Pre-populate form with role data
      setFormData({
        name: roleData.name,
        description: roleData.description || '',
        active: roleData.active,
      });

      // Set selected users for modal (current users assigned to this role)
      const currentUserIds = roleData.user_details?.map(user => user.id) || [];
      setSelectedUsersForModal(new Set(currentUserIds));
      
      // Initialize temp states
      setTempPermissions(new Set(roleData.permission_ids || []));
      setTempUsers(new Set(currentUserIds));
    } catch (error) {
      console.error('Error fetching role data:', error);
      toast.error('Error al cargar datos del rol');
      router.push('/admin/roles');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: RoleUpdateRequest = {
        name: formData.name,
        description: formData.description || undefined,
        active: formData.active,
      };

      await RoleFrontendService.update(roleId, updateData);
      toast.success('Rol actualizado exitosamente');
      // Refresh role data
      await fetchRoleAndData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Error al actualizar rol');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = (userId: number) => {
    const newTempUsers = new Set(tempUsers);
    newTempUsers.delete(userId);
    setTempUsers(newTempUsers);
    
    // Check if there are changes compared to original
    const originalUsers = new Set(role?.user_details?.map(user => user.id) || []);
    const hasChanges = 
      newTempUsers.size !== originalUsers.size ||
      [...newTempUsers].some(id => !originalUsers.has(id)) ||
      [...originalUsers].some(id => !newTempUsers.has(id));
    
    setHasUserChanges(hasChanges);
  };

  const handleAddUsers = () => {
    setTempUsers(new Set(selectedUsersForModal));
    setShowUserModal(false);
    
    // Check if there are changes compared to original
    const originalUsers = new Set(role?.user_details?.map(user => user.id) || []);
    const hasChanges = 
      selectedUsersForModal.size !== originalUsers.size ||
      [...selectedUsersForModal].some(id => !originalUsers.has(id)) ||
      [...originalUsers].some(id => !selectedUsersForModal.has(id));
    
    setHasUserChanges(hasChanges);
  };

  const handleSaveUsers = () => {
    if (!role || !hasUserChanges) return;
    setShowUserConfirmModal(true);
  };

  const confirmSaveUsers = async () => {
    try {
      const newUserIds = Array.from(tempUsers);
      await RoleFrontendService.update(roleId, { userIds: newUserIds });
      toast.success('Usuarios actualizados exitosamente');
      setHasUserChanges(false);
      setShowUserConfirmModal(false);
      await fetchRoleAndData();
    } catch (error) {
      console.error('Error updating users:', error);
      toast.error('Error al actualizar usuarios');
    }
  };

  const discardUserChanges = () => {
    if (!role) return;
    const originalUserIds = role.user_details?.map(user => user.id) || [];
    setTempUsers(new Set(originalUserIds));
    setSelectedUsersForModal(new Set(originalUserIds));
    setHasUserChanges(false);
  };

  const handlePermissionToggle = (permissionId: number, isChecked: boolean) => {
    const newTempPermissions = new Set(tempPermissions);
    if (isChecked) {
      newTempPermissions.add(permissionId);
    } else {
      newTempPermissions.delete(permissionId);
    }
    
    setTempPermissions(newTempPermissions);
    
    // Check if there are changes compared to original
    const originalPermissions = new Set(role?.permission_ids || []);
    const hasChanges = 
      newTempPermissions.size !== originalPermissions.size ||
      [...newTempPermissions].some(id => !originalPermissions.has(id)) ||
      [...originalPermissions].some(id => !newTempPermissions.has(id));
    
    setHasPermissionChanges(hasChanges);
  };

  const handleSavePermissions = () => {
    if (!role || !hasPermissionChanges) return;
    setShowPermissionConfirmModal(true);
  };

  const confirmSavePermissions = async () => {
    try {
      const newPermissionIds = Array.from(tempPermissions);
      await RoleFrontendService.update(roleId, { permissionIds: newPermissionIds });
      toast.success('Permisos actualizados exitosamente');
      setHasPermissionChanges(false);
      setShowPermissionConfirmModal(false);
      await fetchRoleAndData();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Error al actualizar permisos');
    }
  };

  const discardPermissionChanges = () => {
    if (!role) return;
    setTempPermissions(new Set(role.permission_ids || []));
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

    // If showing only role permissions, filter out modules with no role permissions
    if (showOnlyRolePermissions && role) {
      const filteredGrouped: Record<string, typeof availablePermissions> = {};
      
      Object.entries(grouped).forEach(([module, modulePermissions]) => {
        const moduleRolePermissions = modulePermissions.filter(permission => 
          tempPermissions.has(permission.id) || false
        );
        
        if (moduleRolePermissions.length > 0) {
          filteredGrouped[module] = showOnlyRolePermissions ? moduleRolePermissions : modulePermissions;
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
            <p className="text-muted-foreground">Cargando datos del rol...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!role) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Rol no encontrado</p>
            <Button asChild>
              <Link href="/admin/roles">Volver a Roles</Link>
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
            <Link href="/admin/roles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Roles
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editar Rol</h1>
            <p className="text-muted-foreground">
              Actualizando información de: <span className="font-medium">{role.name}</span>
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
              Datos básicos del rol
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
              
              {/* Role Info */}
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><span className="font-medium">ID:</span> {role.id}</p>
                  <p><span className="font-medium">Creado:</span> {new Date(role.created_at).toLocaleDateString('es-ES')}</p>
                  <p><span className="font-medium">Usuarios asignados:</span> {role.user_details?.length || 0}</p>
                  <p><span className="font-medium">Permisos asignados:</span> {role.permission_ids?.length || 0}</p>
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

        {/* Users and Permissions Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios y Permisos</CardTitle>
            <CardDescription>
              Gestiona los usuarios asignados a este rol y sus permisos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Usuarios ({role.user_details?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="permissions" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Permisos ({role.permission_ids?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Usuarios que tienen este rol asignado
                  </p>
                  {hasUserChanges && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={discardUserChanges}
                      >
                        Descartar Cambios
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleSaveUsers}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Usuarios
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Gestionar Usuarios
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Asignar Usuarios</DialogTitle>
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
                                checked={selectedUsersForModal.has(user.id)}
                                onCheckedChange={(checked) => {
                                  const newUsers = new Set(selectedUsersForModal);
                                  if (checked) {
                                    newUsers.add(user.id);
                                  } else {
                                    newUsers.delete(user.id);
                                  }
                                  setSelectedUsersForModal(newUsers);
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
                            Cancelar
                          </Button>
                          <Button onClick={handleAddUsers}>
                            Aplicar Cambios
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {(() => {
                    const tempUserDetails = availableUsers.filter(user => tempUsers.has(user.id));
                    return tempUserDetails.length > 0 ? (
                      tempUserDetails.map((user) => (
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
                        No hay usuarios asignados a este rol
                      </div>
                    );
                  })()}
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Permisos que otorga este rol a los usuarios asignados.
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
                        id="show-only-role"
                        checked={showOnlyRolePermissions}
                        onCheckedChange={setShowOnlyRolePermissions}
                      />
                      <Label htmlFor="show-only-role" className="text-sm whitespace-nowrap">
                        Solo permisos del rol
                      </Label>
                      <Filter className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* Results summary */}
                {(permissionSearch || showOnlyRolePermissions) && (
                  <div className="text-sm text-muted-foreground">
                    {Object.keys(permissionsByModule).length === 0 ? (
                      <div className="text-center py-8">
                        <p>No se encontraron permisos que coincidan con los filtros.</p>
                        {(permissionSearch || showOnlyRolePermissions) && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={() => {
                              setPermissionSearch('');
                              setShowOnlyRolePermissions(false);
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
                        {showOnlyRolePermissions && ' del rol'}
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
                            const hasPermission = tempPermissions.has(permission.id) || false;

                            return (
                              <div key={permission.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center space-x-3">
                                  <Switch
                                    checked={hasPermission}
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

      {/* User Confirmation Modal */}
      <Dialog open={showUserConfirmModal} onOpenChange={setShowUserConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Cambios de Usuarios</DialogTitle>
            <DialogDescription>
              Revisa los cambios que se aplicarán a los usuarios del rol
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              if (!role) return null;
              
              const originalUsers = new Set(role.user_details?.map(user => user.id) || []);
              const newUsers = tempUsers;
              
              const toAdd = [...newUsers].filter(id => !originalUsers.has(id));
              const toRemove = [...originalUsers].filter(id => !newUsers.has(id));
              
              const usersToAdd = availableUsers.filter(u => toAdd.includes(u.id));
              const usersToRemove = availableUsers.filter(u => toRemove.includes(u.id));
              
              return (
                <div className="space-y-4">
                  {usersToAdd.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">
                        ✅ Usuarios a agregar ({usersToAdd.length}):
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {usersToAdd.map(user => (
                          <div key={user.id} className="text-sm p-2 bg-green-50 rounded flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {usersToRemove.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-700 mb-2">
                        ❌ Usuarios a eliminar ({usersToRemove.length}):
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {usersToRemove.map(user => (
                          <div key={user.id} className="text-sm p-2 bg-red-50 rounded flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {toAdd.length === 0 && toRemove.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground mb-2">No hay cambios para aplicar</p>
                      <p className="text-xs text-muted-foreground">
                        Los usuarios del rol permanecerán igual
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUserConfirmModal(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmSaveUsers}>
                Confirmar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permission Confirmation Modal */}
      <Dialog open={showPermissionConfirmModal} onOpenChange={setShowPermissionConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Cambios de Permisos</DialogTitle>
            <DialogDescription>
              Revisa los cambios que se aplicarán a los permisos del rol
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              if (!role) return null;
              
              // Get the original role permissions
              const originalRolePermissions = new Set(role.permission_ids || []);
              const newRolePermissions = tempPermissions;
              
              // Compare only the role's direct permissions
              const toAdd = [...newRolePermissions].filter(id => !originalRolePermissions.has(id));
              const toRemove = [...originalRolePermissions].filter(id => !newRolePermissions.has(id));
              
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
                        Los permisos del rol permanecerán igual
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