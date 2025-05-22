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
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';

interface OrganizationFormProps {
  organization?: OrganizationType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function OrganizationForm({ organization, open, onOpenChange, onSuccess }: OrganizationFormProps) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    rut: '',
    active: true,
  });

  const isEditing = !!organization;

  useEffect(() => {
    if (open) {
      if (organization) {
        setFormData({
          name: organization.name,
          logo: organization.logo || '',
          rut: organization.rut || '',
          active: organization.active,
        });
      } else {
        setFormData({
          name: '',
          logo: '',
          rut: '',
          active: true,
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

    setLoading(true);
    try {
      if (isEditing && organization) {
        const updateData: OrganizationUpdateRequest = {
          name: formData.name.trim(),
          logo: formData.logo.trim() || undefined,
          rut: formData.rut.trim() || undefined,
          active: formData.active,
        };
        
        await OrganizationFrontendService.update(organization.id, updateData);
        toast.success('Organización actualizada exitosamente');
      } else {
        const createData: OrganizationCreateRequest = {
          name: formData.name.trim(),
          logo: formData.logo.trim() || undefined,
          rut: formData.rut.trim() || undefined,
          active: formData.active,
        };
        
        await OrganizationFrontendService.create(createData);
        toast.success('Organización creada exitosamente');
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar organización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="logo">Logo (URL)</Label>
            <Input
              id="logo"
              type="url"
              placeholder="https://ejemplo.com/logo.png"
              value={formData.logo}
              onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            />
            <Label htmlFor="active">Organización activa</Label>
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
              {isEditing ? 'Actualizar' : 'Crear'} Organización
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}