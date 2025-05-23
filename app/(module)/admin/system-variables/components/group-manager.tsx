'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Loader2, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SystemVariableGroup, CreateGroupRequest, UpdateGroupRequest } from '../types';
import { SystemVariableGroupsFrontendService } from '../services/groups.frontend.service';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

interface GroupManagerProps {
  onGroupsChange?: () => void;
}

export function GroupManager({ onGroupsChange }: GroupManagerProps) {
  const { hasPermission } = useAuth();
  const [groups, setGroups] = useState<SystemVariableGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SystemVariableGroup | null>(null);
  const [formData, setFormData] = useState<CreateGroupRequest>({
    name: '',
    description: '',
    display_order: 0
  });
  const [isSaving, setIsSaving] = useState(false);

  const canManageGroups = hasPermission('system_variables:groups:manage');

  useEffect(() => {
    if (canManageGroups) {
      loadGroups();
    }
  }, [canManageGroups]);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const result = await SystemVariableGroupsFrontendService.getAll({
        search: searchTerm || undefined,
        active: true
      });
      setGroups(result.groups || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Error al cargar grupos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    loadGroups();
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
      display_order: groups.length
    });
    setIsDialogOpen(true);
  };

  const handleEditGroup = (group: SystemVariableGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      display_order: group.display_order
    });
    setIsDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    try {
      setIsSaving(true);
      
      if (editingGroup) {
        await SystemVariableGroupsFrontendService.update(editingGroup.id, formData);
        toast.success('Grupo actualizado correctamente');
      } else {
        await SystemVariableGroupsFrontendService.create(formData);
        toast.success('Grupo creado correctamente');
      }
      
      setIsDialogOpen(false);
      await loadGroups();
      onGroupsChange?.();
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar grupo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (group: SystemVariableGroup) => {
    if (!confirm(`¿Está seguro de eliminar el grupo "${group.name}"?`)) {
      return;
    }

    try {
      await SystemVariableGroupsFrontendService.delete(group.id);
      toast.success('Grupo eliminado correctamente');
      await loadGroups();
      onGroupsChange?.();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar grupo');
    }
  };

  if (!canManageGroups) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Grupos de Variables
          </CardTitle>
          <CardDescription>
            No tiene permisos para gestionar grupos de variables.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Grupos de Variables
            </CardTitle>
            <CardDescription>
              Organice las variables del sistema en grupos para mejor gestión.
            </CardDescription>
          </div>
          <Button onClick={handleCreateGroup}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Grupo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Buscar grupos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} variant="outline">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Cargando grupos...
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No se encontraron grupos' : 'No hay grupos configurados'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-center">Variables</TableHead>
                <TableHead className="text-center">Orden</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {group.description || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {group.variable_count || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {group.display_order}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={group.active ? "default" : "secondary"}>
                      {group.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditGroup(group)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteGroup(group)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}
              </DialogTitle>
              <DialogDescription>
                {editingGroup 
                  ? 'Modifique los datos del grupo de variables.'
                  : 'Complete los datos para crear un nuevo grupo de variables.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Numeración, Límites, etc."
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción opcional del grupo..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="display_order">Orden de Visualización</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveGroup}
                disabled={!formData.name.trim() || isSaving}
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingGroup ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}