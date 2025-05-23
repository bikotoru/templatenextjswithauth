'use client';

import { useState, useEffect } from 'react';
import { UserFrontendService } from '../services/frontend.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, Copy, CheckCircle, AlertCircle } from 'lucide-react';

interface AddUserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddUserForm({ open, onOpenChange, onSuccess }: AddUserFormProps) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<{ id: number; name: string; description?: string }[]>([]);
  const [permissions, setPermissions] = useState<{ id: number; permission_key: string; display_name: string; module: string }[]>([]);
  const [result, setResult] = useState<{ userId: number; isNewUser: boolean; temporaryPassword?: string } | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    temporaryPassword: '',
    selectedRoles: new Set<number>(),
    selectedPermissions: new Set<number>(),
  });

  useEffect(() => {
    if (open) {
      fetchRolesAndPermissions();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      temporaryPassword: '',
      selectedRoles: new Set(),
      selectedPermissions: new Set(),
    });
    setResult(null);
  };

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
    
    if (!formData.email) {
      toast.error('El email es requerido');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        email: formData.email.trim(),
        name: formData.name.trim() || undefined,
        roleIds: Array.from(formData.selectedRoles),
        permissionIds: Array.from(formData.selectedPermissions),
        temporaryPassword: formData.temporaryPassword.trim() || undefined,
      };

      const result = await UserFrontendService.addUser(userData);
      setResult(result);

      if (result.isNewUser) {
        toast.success('Usuario creado y asignado exitosamente');
      } else {
        toast.success('Usuario asignado a la organización exitosamente');
      }

    } catch (error) {
      console.error('Error adding user:', error);
      toast.error(error instanceof Error ? error.message : 'Error al agregar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (result) {
      onSuccess(); // Refresh the user list
    }
    onOpenChange(false);
  };

  const copyPassword = () => {
    if (result?.temporaryPassword) {
      navigator.clipboard.writeText(result.temporaryPassword);
      toast.success('Contraseña copiada al portapapeles');
    }
  };

  const handleRoleChange = (roleId: number, checked: boolean) => {
    setFormData(prev => {
      const newRoles = new Set(prev.selectedRoles);
      if (checked) {
        newRoles.add(roleId);
      } else {
        newRoles.delete(roleId);
      }
      return { ...prev, selectedRoles: newRoles };
    });
  };

  const handlePermissionChange = (permissionId: number, checked: boolean) => {
    setFormData(prev => {
      const newPermissions = new Set(prev.selectedPermissions);
      if (checked) {
        newPermissions.add(permissionId);
      } else {
        newPermissions.delete(permissionId);
      }
      return { ...prev, selectedPermissions: newPermissions };
    });
  };

  // Agrupar permisos por módulo
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const moduleKey = permission.module || 'general';
    if (!acc[moduleKey]) {
      acc[moduleKey] = [];
    }
    acc[moduleKey].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Usuario {result.isNewUser ? 'Creado' : 'Asignado'} Exitosamente
            </DialogTitle>
            <DialogDescription>
              {result.isNewUser 
                ? 'El usuario ha sido creado y asignado a la organización.' 
                : 'El usuario existente ha sido asignado a la organización.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {result.isNewUser && result.temporaryPassword && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Contraseña temporal generada:</strong></p>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {result.temporaryPassword}
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={copyPassword}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Asegúrese de compartir esta contraseña con el usuario de forma segura.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Usuario</DialogTitle>
          <DialogDescription>
            Ingrese el email del usuario. Si no existe, se creará automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre (para usuarios nuevos)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nombre completo"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temporaryPassword">Contraseña temporal (opcional)</Label>
              <Input
                id="temporaryPassword"
                type="password"
                placeholder="Dejar vacío para generar automáticamente"
                value={formData.temporaryPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, temporaryPassword: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Si se deja vacío, se generará &quot;123456&quot; como contraseña temporal
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Roles</Label>
              <ScrollArea className="h-32 w-full border rounded-md p-3">
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={formData.selectedRoles.has(role.id)}
                        onCheckedChange={(checked) => handleRoleChange(role.id, checked as boolean)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label 
                          htmlFor={`role-${role.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
              </ScrollArea>
            </div>

            <div>
              <Label className="text-base font-medium">Permisos Directos</Label>
              <ScrollArea className="h-40 w-full border rounded-md p-3">
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                    <div key={module}>
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        {module}
                      </h4>
                      <div className="space-y-2 ml-2">
                        {modulePermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`permission-${permission.id}`}
                              checked={formData.selectedPermissions.has(permission.id)}
                              onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                            />
                            <Label 
                              htmlFor={`permission-${permission.id}`}
                              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {permission.display_name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Agregar Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}