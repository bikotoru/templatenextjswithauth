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
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';

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
  
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    rut: '',
    active: true,
    expires_at: '',
    neverExpires: true,
  });

  const isEditing = !!organization;

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