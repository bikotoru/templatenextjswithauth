'use client';

import { useState, useEffect } from 'react';
import { UserType, UserCreateRequest, UserUpdateRequest } from '../types';
import { UserFrontendService } from '../services/frontend.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    avatar: '',
    active: true,
  });

  const isEditing = !!user;

  useEffect(() => {
    if (open) {
      if (user) {
        setFormData({
          email: user.email,
          password: '',
          name: user.name,
          avatar: user.avatar || '',
          active: user.active,
        });
      } else {
        setFormData({
          email: '',
          password: '',
          name: '',
          avatar: '',
          active: true,
        });
      }
    }
  }, [open, user]);


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
        toast.success('Usuario actualizado exitosamente');
      } else {
        const createData: UserCreateRequest = {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          avatar: formData.avatar || undefined,
          active: formData.active,
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