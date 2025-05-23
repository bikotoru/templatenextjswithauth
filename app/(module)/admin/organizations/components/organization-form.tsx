'use client';

import { useState, useEffect } from 'react';
import { OrganizationType, OrganizationCreateRequest, OrganizationUpdateRequest } from '../types';
import { OrganizationFrontendService } from '../services/frontend.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Loader2, Building2, User, Users, Check, ChevronsUpDown } from 'lucide-react';

interface OrganizationFormProps {
  organization?: OrganizationType | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess: () => void;
  onCancel?: () => void;
  showAsPage?: boolean;
}

export default function OrganizationForm({ 
  organization, 
  open = true, 
  onOpenChange, 
  onSuccess, 
  onCancel, 
  showAsPage = false 
}: OrganizationFormProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Array<{id: number, name: string, email: string}>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSelectorOpen, setUserSelectorOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    rut: '',
    active: true,
    expires_at: '',
    neverExpires: true,
    adminType: 'new' as 'existing' | 'new',
    existingUserId: '',
    newUserEmail: '',
    newUserName: '',
    newUserPassword: '',
  });

  const isEditing = !!organization;

  useEffect(() => {
    // Cargar usuarios existentes solo para creación
    if (open && !isEditing) {
      loadUsers();
    }
  }, [open, isEditing]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      // Llamada a API para obtener usuarios
      const response = await fetch('/api/admin/users/simple');
      if (response.ok) {
        const result = await response.json();
        setUsers(result.data || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (organization) {
        const hasExpiration = !!organization.expires_at;
        setFormData({
          name: organization.name,
          logo: organization.logo || '',
          rut: organization.rut || '',
          active: organization.active,
          expires_at: hasExpiration ? organization.expires_at!.split('T')[0] : '',
          neverExpires: !hasExpiration,
        });
      } else {
        setFormData({
          name: '',
          logo: '',
          rut: '',
          active: true,
          expires_at: '',
          neverExpires: true,
          adminType: 'new',
          existingUserId: '',
          newUserEmail: '',
          newUserName: '',
          newUserPassword: '',
        });
      }
    }
  }, [open, organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('El nombre de la organización es requerido');
      return;
    }

    if (formData.name.toUpperCase() === 'SYSTEM') {
      toast.error('No se puede usar el nombre "SYSTEM"');
      return;
    }

    // Validaciones para el administrador (solo al crear)
    if (!isEditing) {
      if (formData.adminType === 'existing') {
        if (!formData.existingUserId) {
          toast.error('Debe seleccionar un usuario existente');
          return;
        }
      } else {
        if (!formData.newUserEmail.trim()) {
          toast.error('El email del administrador es requerido');
          return;
        }
        if (!formData.newUserName.trim()) {
          toast.error('El nombre del administrador es requerido');
          return;
        }
        if (!formData.newUserPassword.trim()) {
          toast.error('La contraseña del administrador es requerida');
          return;
        }
        if (formData.newUserPassword.length < 6) {
          toast.error('La contraseña debe tener al menos 6 caracteres');
          return;
        }
      }
    }

    setLoading(true);
    try {
      if (isEditing && organization) {
        const updateData: OrganizationUpdateRequest = {
          name: formData.name.trim(),
          logo: formData.logo.trim() || undefined,
          rut: formData.rut.trim() || undefined,
          active: formData.active,
          expires_at: formData.neverExpires ? null : formData.expires_at || null,
        };
        
        await OrganizationFrontendService.update(organization.id, updateData);
        toast.success('Organización actualizada exitosamente');
      } else {
        const createData: OrganizationCreateRequest = {
          name: formData.name.trim(),
          logo: formData.logo.trim() || undefined,
          rut: formData.rut.trim() || undefined,
          active: formData.active,
          expires_at: formData.neverExpires ? null : formData.expires_at || null,
          adminUser: {
            type: formData.adminType,
            existingUserId: formData.adminType === 'existing' ? parseInt(formData.existingUserId) : undefined,
            newUser: formData.adminType === 'new' ? {
              email: formData.newUserEmail.trim(),
              name: formData.newUserName.trim(),
              password: formData.newUserPassword.trim(),
            } : undefined,
          },
        };
        
        await OrganizationFrontendService.create(createData);
        toast.success('Organización creada exitosamente');
      }
      
      onSuccess();
      onOpenChange?.(false);
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar organización');
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            type="text"
            placeholder="Nombre de la organización"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rut">RUT</Label>
          <Input
            id="rut"
            type="text"
            placeholder="12345678-9"
            value={formData.rut}
            onChange={(e) => setFormData(prev => ({ ...prev, rut: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo">Logo URL</Label>
        <Input
          id="logo"
          type="url"
          placeholder="https://ejemplo.com/logo.png"
          value={formData.logo}
          onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="neverExpires"
            checked={formData.neverExpires}
            onCheckedChange={(checked) => setFormData(prev => ({ 
              ...prev, 
              neverExpires: checked,
              expires_at: checked ? '' : prev.expires_at
            }))}
          />
          <Label htmlFor="neverExpires">Nunca expira</Label>
        </div>

        {!formData.neverExpires && (
          <div className="space-y-2">
            <Label htmlFor="expires_at">Fecha de expiración</Label>
            <Input
              id="expires_at"
              type="date"
              value={formData.expires_at}
              onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="active"
          checked={formData.active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
        />
        <Label htmlFor="active">Organización activa</Label>
      </div>

      {/* Sección del Administrador - Solo para creación */}
      {!isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Administrador de la Organización
            </CardTitle>
            <CardDescription>
              Configura el usuario que será el administrador de esta organización.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Usuario</Label>
              <Select 
                value={formData.adminType} 
                onValueChange={(value: 'existing' | 'new') => 
                  setFormData(prev => ({ 
                    ...prev, 
                    adminType: value,
                    existingUserId: '',
                    newUserEmail: '',
                    newUserName: '',
                    newUserPassword: ''
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Usuario Existente</SelectItem>
                  <SelectItem value="new">Crear Nuevo Usuario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.adminType === 'existing' && (
              <div className="space-y-2">
                <Label htmlFor="existingUser">Usuario Existente *</Label>
                {loadingUsers ? (
                  <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando usuarios...
                  </div>
                ) : (
                  <Popover open={userSelectorOpen} onOpenChange={setUserSelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={userSelectorOpen}
                        className="w-full justify-between"
                      >
                        {formData.existingUserId
                          ? (() => {
                              const selectedUser = users.find(user => user.id.toString() === formData.existingUserId);
                              return selectedUser ? `${selectedUser.name} (${selectedUser.email})` : "Selecciona un usuario";
                            })()
                          : "Selecciona un usuario"
                        }
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar usuario..." />
                        <CommandList>
                          <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                          <CommandGroup>
                            {users.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={`${user.name} ${user.email}`}
                                onSelect={() => {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    existingUserId: user.id.toString() 
                                  }));
                                  setUserSelectorOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    formData.existingUserId === user.id.toString() 
                                      ? "opacity-100" 
                                      : "opacity-0"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{user.name}</span>
                                  <span className="text-sm text-muted-foreground">{user.email}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}

            {formData.adminType === 'new' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newUserEmail">Email *</Label>
                    <Input
                      id="newUserEmail"
                      type="email"
                      placeholder="admin@empresa.com"
                      value={formData.newUserEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, newUserEmail: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newUserName">Nombre Completo *</Label>
                    <Input
                      id="newUserName"
                      type="text"
                      placeholder="Juan Pérez"
                      value={formData.newUserName}
                      onChange={(e) => setFormData(prev => ({ ...prev, newUserName: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newUserPassword">Contraseña *</Label>
                  <Input
                    id="newUserPassword"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.newUserPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, newUserPassword: e.target.value }))}
                    required
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className={showAsPage ? "flex justify-end gap-3" : "flex justify-end gap-3 pt-4"}>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel || (() => onOpenChange?.(false))}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Actualizar' : 'Crear'} Organización
        </Button>
      </div>
    </form>
  );

  if (showAsPage) {
    return formContent;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditing ? 'Editar Organización' : 'Nueva Organización'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifica los datos de la organización.' 
              : 'Crea una nueva organización en el sistema.'}
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}