'use client';

import { useState, useEffect } from 'react';
import { UserType, UserCreateRequest, UserUpdateRequest } from '../types';
import { UserFrontendService } from '../services/frontend.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UserFormProps {
  user?: UserType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function UserForm({ user, open, onOpenChange, onSuccess }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<{ id: number; name: string; description?: string }[]>([]);
  const [permissions, setPermissions] = useState<{ id: number; permission_key: string; display_name: string; module: string }[]>([]);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    avatar: '',
    active: true,
    selectedRoles: new Set<number>(),
    selectedPermissions: new Set<number>(),
  });

  const isEditing = !!user;

  useEffect(() => {
    if (open) {
      fetchRolesAndPermissions();
      if (user) {
        setFormData({
          email: user.email,
          password: '',
          name: user.name,
          avatar: user.avatar || '',
          active: user.active,
          selectedRoles: new Set(),
          selectedPermissions: new Set(),
        });
        // TODO: Load user's current roles and permissions
      } else {
        setFormData({
          email: '',
          password: '',
          name: '',
          avatar: '',
          active: true,
          selectedRoles: new Set(),
          selectedPermissions: new Set(),
        });
      }
    }
  }, [open, user]);

  const fetchRolesAndPermissions = async () => {
    try {
      const [rolesData, permissionsData] = await Promise.all([
        UserFrontendService.getRoles(),
        UserFrontendService.getPermissions()
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error('Error fetching roles and permissions:', error);
      toast.error('Error al cargar roles y permisos');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing && user) {
        const updateData: UserUpdateRequest = {
          email: formData.email,
          name: formData.name,
          avatar: formData.avatar || undefined,
          active: formData.active,
        };

        if (formData.password) {
          updateData.password = formData.password;
        }

        await UserFrontendService.update(user.id, updateData);
        
        // Update roles and permissions
        if (formData.selectedRoles.size > 0) {
          await UserFrontendService.assignRoles(user.id, Array.from(formData.selectedRoles));
        }
        if (formData.selectedPermissions.size > 0) {
          await UserFrontendService.assignPermissions(user.id, Array.from(formData.selectedPermissions));
        }

        toast.success('Usuario actualizado exitosamente');
      } else {
        const createData: UserCreateRequest = {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          avatar: formData.avatar || undefined,
          active: formData.active,
          roleIds: Array.from(formData.selectedRoles),
          permissionIds: Array.from(formData.selectedPermissions),
        };

        await UserFrontendService.create(createData);
        toast.success('Usuario creado exitosamente');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(isEditing ? 'Error al actualizar usuario' : 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (roleId: number, checked: boolean) => {
    const newRoles = new Set(formData.selectedRoles);
    if (checked) {
      newRoles.add(roleId);
    } else {
      newRoles.delete(roleId);
    }
    setFormData({ ...formData, selectedRoles: newRoles });
  };

  const handlePermissionChange = (permissionId: number, checked: boolean) => {
    const newPermissions = new Set(formData.selectedPermissions);
    if (checked) {
      newPermissions.add(permissionId);
    } else {
      newPermissions.delete(permissionId);
    }
    setFormData({ ...formData, selectedPermissions: newPermissions });
  };

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifica la información del usuario y sus permisos.'
              : 'Completa la información para crear un nuevo usuario.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Información Básica</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">
                      {isEditing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="avatar">Avatar URL (opcional)</Label>
                    <Input
                      id="avatar"
                      value={formData.avatar}
                      onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
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
              </div>

              <Separator />

              {/* Roles */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Roles</h3>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={formData.selectedRoles.has(role.id)}
                        onCheckedChange={(checked) => handleRoleChange(role.id, checked as boolean)}
                      />
                      <Label 
                        htmlFor={`role-${role.id}`} 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {role.name}
                        {role.description && (
                          <span className="text-xs text-muted-foreground block">
                            {role.description}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Permissions */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Permisos Directos</h3>
                <p className="text-sm text-muted-foreground">
                  Estos permisos se asignan directamente al usuario, además de los permisos heredados por roles.
                </p>
                
                {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                  <div key={module} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase">
                      {module}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 pl-4">
                      {modulePermissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`permission-${permission.id}`}
                            checked={formData.selectedPermissions.has(permission.id)}
                            onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                          />
                          <Label 
                            htmlFor={`permission-${permission.id}`} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {permission.display_name}
                            <span className="text-xs text-muted-foreground block">
                              {permission.permission_key}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                isEditing ? 'Actualizar Usuario' : 'Crear Usuario'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}