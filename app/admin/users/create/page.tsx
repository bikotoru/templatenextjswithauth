'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import { UserFrontendService } from '@/app/(module)/admin/users/services/frontend.service';
import { UserCreateRequest } from '@/app/(module)/admin/users/types';
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
import { ArrowLeft, Save, User, Shield, Key, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import Link from 'next/link';

export default function CreateUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<{ id: number; name: string; description?: string }[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<{ id: number; permission_key: string; display_name: string; module: string }[]>([]);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    avatar: '',
    active: true,
  });

  const [selectedRoles, setSelectedRoles] = useState<Set<number>>(new Set());
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRolesForModal, setSelectedRolesForModal] = useState<Set<number>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      const [rolesData, permissionsData] = await Promise.all([
        UserFrontendService.getRoles(),
        UserFrontendService.getPermissions()
      ]);
      setAvailableRoles(Array.isArray(rolesData) ? rolesData : []);
      setAvailablePermissions(Array.isArray(permissionsData) ? permissionsData : []);
    } catch (error) {
      console.error('Error fetching roles and permissions:', error);
      toast.error('Error al cargar roles y permisos');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const createData: UserCreateRequest = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        avatar: formData.avatar || undefined,
        active: formData.active,
        roleIds: Array.from(selectedRoles),
        permissionIds: Array.from(selectedPermissions),
      };

      await UserFrontendService.create(createData);
      toast.success('Usuario creado exitosamente');
      router.push('/admin/users');
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = (roleId: number) => {
    const newRoles = new Set(selectedRoles);
    newRoles.delete(roleId);
    setSelectedRoles(newRoles);
  };

  const handleAddRoles = () => {
    setSelectedRoles(new Set(selectedRolesForModal));
    setShowRoleModal(false);
  };

  const handlePermissionToggle = (permissionId: number, isChecked: boolean) => {
    const newPermissions = new Set(selectedPermissions);
    if (isChecked) {
      newPermissions.add(permissionId);
    } else {
      newPermissions.delete(permissionId);
    }
    setSelectedPermissions(newPermissions);
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

  // Group permissions by module
  const permissionsByModule = availablePermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, typeof availablePermissions>);

  // Get selected role details
  const selectedRoleDetails = availableRoles.filter(role => selectedRoles.has(role.id));

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
            <h1 className="text-2xl font-bold">Crear Nuevo Usuario</h1>
            <p className="text-muted-foreground">Completa la información del usuario y asigna roles y permisos</p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Contraseña segura"
                    required
                  />
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
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Usuario activo</Label>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Crear Usuario
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
              Asigna roles y permisos al nuevo usuario
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
                    Roles que se asignarán al usuario
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
                  {selectedRoleDetails.length > 0 ? (
                    selectedRoleDetails.map((role) => (
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
                      No hay roles seleccionados
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Permisos directos adicionales que se asignarán al usuario (además de los heredados por roles).
                </p>

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