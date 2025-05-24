'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  GripVertical, 
  Eye, 
  Save,
  X,
  Check,
  ToggleLeft,
  Hash,
  Type,
  List,
  FileJson
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface SystemVariable {
  id: string;
  key: string;
  name: string;
  description: string;
  default_value: string;
  data_type: 'string' | 'number' | 'boolean' | 'json' | 'select' | 'range';
  category: string;
  is_required: boolean;
  is_editable: boolean;
  config?: {
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
    multiple?: boolean;
    validation_pattern?: string;
    max_length?: number;
    auto_increment?: boolean;
    start_value?: number;
  };
  created_at: string;
  updated_at: string;
}

const VARIABLE_CATEGORIES = [
  'branding',
  'general',
  'security', 
  'notifications',
  'ui',
  'integrations'
];

const DATA_TYPES = [
  { value: 'string', label: 'Texto', icon: Type, description: 'Campo de texto simple' },
  { value: 'number', label: 'Número', icon: Hash, description: 'Valor numérico' },
  { value: 'boolean', label: 'Switch', icon: ToggleLeft, description: 'Verdadero/Falso' },
  { value: 'select', label: 'Lista', icon: List, description: 'Selección de opciones' },
  { value: 'range', label: 'Rango', icon: Hash, description: 'Slider numérico' },
  { value: 'json', label: 'JSON', icon: FileJson, description: 'Datos estructurados' }
];

export default function VariablesDesignerPage() {
  const { hasPermission } = useAuth();
  const [variables, setVariables] = useState<SystemVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewVariable, setPreviewVariable] = useState<Partial<SystemVariable> | null>(null);

  const [newVariable, setNewVariable] = useState<Partial<SystemVariable>>({
    key: '',
    name: '',
    description: '',
    default_value: '',
    data_type: 'string',
    category: 'general',
    is_required: false,
    is_editable: true,
    config: {}
  });

  // Check permissions
  if (!hasPermission('variables:manage')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No tienes permisos para administrar las variables del sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchVariables = async () => {
    try {
      const response = await fetch('/api/admin/system-variables');
      if (response.ok) {
        const data = await response.json();
        setVariables(data);
      } else {
        toast.error('Error al cargar las variables del sistema');
      }
    } catch (error) {
      console.error('Error fetching variables:', error);
      toast.error('Error al cargar las variables del sistema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariables();
  }, []);

  const groupedVariables = variables.reduce((groups, variable) => {
    const category = variable.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(variable);
    return groups;
  }, {} as Record<string, SystemVariable[]>);

  const filteredCategories = selectedCategory === 'all' 
    ? Object.keys(groupedVariables)
    : [selectedCategory];

  const handleStartCreating = () => {
    setIsCreating(true);
    setNewVariable({
      key: '',
      name: '',
      description: '',
      default_value: '',
      data_type: 'string',
      category: 'general',
      is_required: false,
      is_editable: true,
      config: {}
    });
  };

  const handleCancelCreating = () => {
    setIsCreating(false);
    setNewVariable({});
  };

  const handleSaveNew = async () => {
    if (!newVariable.key || !newVariable.name || !newVariable.description) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const response = await fetch('/api/admin/system-variables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newVariable),
      });

      if (response.ok) {
        toast.success('Variable creada correctamente');
        setIsCreating(false);
        fetchVariables();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al crear la variable');
      }
    } catch (error) {
      console.error('Error creating variable:', error);
      toast.error('Error al crear la variable');
    }
  };

  const handleDelete = async (variableId: string) => {
    try {
      const response = await fetch(`/api/admin/system-variables/${variableId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Variable eliminada correctamente');
        fetchVariables();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al eliminar la variable');
      }
    } catch (error) {
      console.error('Error deleting variable:', error);
      toast.error('Error al eliminar la variable');
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const sourceCategory = result.source.droppableId;
    const destCategory = result.destination.droppableId;
    
    if (sourceCategory === destCategory) return;

    const variableId = result.draggableId;
    // TODO: Implement category change API call
    console.log(`Moving variable ${variableId} from ${sourceCategory} to ${destCategory}`);
  };

  const getVariableIcon = (dataType: string) => {
    const type = DATA_TYPES.find(t => t.value === dataType);
    return type ? type.icon : Type;
  };

  const renderVariablePreview = (variable: Partial<SystemVariable>) => {
    if (!variable.data_type) return null;

    const value = variable.default_value || '';

    switch (variable.data_type) {
      case 'boolean':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview:</Label>
            <Switch checked={value === 'true'} disabled />
          </div>
        );
      case 'number':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview:</Label>
            <Input type="number" value={value} disabled className="w-32" />
          </div>
        );
      case 'range':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview:</Label>
            <div className="px-3">
              <Slider
                value={[parseInt(value) || 0]}
                min={variable.config?.min || 0}
                max={variable.config?.max || 100}
                step={variable.config?.step || 1}
                disabled
                className="w-32"
              />
            </div>
          </div>
        );
      case 'select':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview:</Label>
            <Select value={value} disabled>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {variable.config?.options?.map((option, index) => (
                  <SelectItem key={index} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'json':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview:</Label>
            <Textarea 
              value={value} 
              disabled 
              className="w-48 h-20 font-mono text-xs" 
              placeholder='{"key": "value"}'
            />
          </div>
        );
      default:
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview:</Label>
            <Input value={value} disabled className="w-48" />
          </div>
        );
    }
  };

  const renderConfigOptions = (variable: Partial<SystemVariable>, setter: (config: any) => void) => {
    const config = variable.config || {};

    switch (variable.data_type) {
      case 'number':
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Mínimo</Label>
              <Input 
                type="number" 
                value={config.min || ''} 
                onChange={(e) => setter({...config, min: parseInt(e.target.value) || 0})}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Máximo</Label>
              <Input 
                type="number" 
                value={config.max || ''} 
                onChange={(e) => setter({...config, max: parseInt(e.target.value) || 100})}
                className="h-8 text-xs"
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center space-x-2 text-xs">
                <Checkbox 
                  checked={config.auto_increment || false}
                  onCheckedChange={(checked) => setter({...config, auto_increment: checked})}
                />
                <span>Auto-incremental</span>
              </label>
            </div>
            {config.auto_increment && (
              <div>
                <Label className="text-xs">Empezar en</Label>
                <Input 
                  type="number" 
                  value={config.start_value || 1} 
                  onChange={(e) => setter({...config, start_value: parseInt(e.target.value) || 1})}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>
        );
      case 'range':
        return (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Mín</Label>
              <Input 
                type="number" 
                value={config.min || 0} 
                onChange={(e) => setter({...config, min: parseInt(e.target.value) || 0})}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Máx</Label>
              <Input 
                type="number" 
                value={config.max || 100} 
                onChange={(e) => setter({...config, max: parseInt(e.target.value) || 100})}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Paso</Label>
              <Input 
                type="number" 
                value={config.step || 1} 
                onChange={(e) => setter({...config, step: parseInt(e.target.value) || 1})}
                className="h-8 text-xs"
              />
            </div>
          </div>
        );
      case 'select':
        return (
          <div className="space-y-2">
            <Label className="text-xs">Opciones (una por línea)</Label>
            <Textarea 
              value={(config.options || []).join('\n')}
              onChange={(e) => setter({...config, options: e.target.value.split('\n').filter(o => o.trim())})}
              className="h-20 text-xs"
              placeholder="Opción 1\nOpción 2\nOpción 3"
            />
            <label className="flex items-center space-x-2 text-xs">
              <Checkbox 
                checked={config.multiple || false}
                onCheckedChange={(checked) => setter({...config, multiple: checked})}
              />
              <span>Selección múltiple</span>
            </label>
          </div>
        );
      case 'string':
        return (
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Longitud máxima</Label>
              <Input 
                type="number" 
                value={config.max_length || ''} 
                onChange={(e) => setter({...config, max_length: parseInt(e.target.value) || undefined})}
                className="h-8 text-xs"
                placeholder="Sin límite"
              />
            </div>
            <div>
              <Label className="text-xs">Patrón de validación (regex)</Label>
              <Input 
                value={config.validation_pattern || ''} 
                onChange={(e) => setter({...config, validation_pattern: e.target.value})}
                className="h-8 text-xs font-mono"
                placeholder="^[a-zA-Z]+$"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando variables...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Diseñador de Variables</h1>
          <p className="text-muted-foreground">
            Crea y gestiona variables que las organizaciones pueden personalizar
          </p>
        </div>
        <Button onClick={handleStartCreating} disabled={isCreating}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Variable
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar variables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {VARIABLE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Variable Creation */}
      {isCreating && (
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Nueva Variable</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleCancelCreating}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Clave*</Label>
                  <Input
                    value={newVariable.key || ''}
                    onChange={(e) => setNewVariable({...newVariable, key: e.target.value})}
                    placeholder="ej: company_name"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Nombre*</Label>
                  <Input
                    value={newVariable.name || ''}
                    onChange={(e) => setNewVariable({...newVariable, name: e.target.value})}
                    placeholder="ej: Nombre de la Empresa"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Categoría*</Label>
                  <Select 
                    value={newVariable.category} 
                    onValueChange={(value) => setNewVariable({...newVariable, category: value})}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VARIABLE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Type & Config */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Tipo de Variable*</Label>
                  <Select 
                    value={newVariable.data_type} 
                    onValueChange={(value: any) => setNewVariable({...newVariable, data_type: value, config: {}})}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center space-x-2">
                              <Icon className="h-4 w-4" />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Type-specific configuration */}
                {renderConfigOptions(newVariable, (config) => setNewVariable({...newVariable, config}))}
                
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm">
                    <Checkbox 
                      checked={newVariable.is_required || false}
                      onCheckedChange={(checked) => setNewVariable({...newVariable, is_required: !!checked})}
                    />
                    <span>Requerida</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <Checkbox 
                      checked={newVariable.is_editable !== false}
                      onCheckedChange={(checked) => setNewVariable({...newVariable, is_editable: !!checked})}
                    />
                    <span>Editable por organizaciones</span>
                  </label>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Descripción*</Label>
                  <Textarea
                    value={newVariable.description || ''}
                    onChange={(e) => setNewVariable({...newVariable, description: e.target.value})}
                    placeholder="Describe para qué sirve esta variable"
                    className="text-sm h-20"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Valor por Defecto</Label>
                  <Input
                    value={newVariable.default_value || ''}
                    onChange={(e) => setNewVariable({...newVariable, default_value: e.target.value})}
                    placeholder="Valor inicial"
                    className="text-sm"
                  />
                </div>
                
                {/* Live Preview */}
                {newVariable.data_type && (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <Label className="text-xs font-medium text-gray-600 mb-2 block">
                      <Eye className="inline h-3 w-3 mr-1" />
                      Vista Previa
                    </Label>
                    {renderVariablePreview(newVariable)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={handleCancelCreating}>
                Cancelar
              </Button>
              <Button onClick={handleSaveNew}>
                <Save className="mr-2 h-4 w-4" />
                Crear Variable
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variables by Category */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-6">
          {filteredCategories.map((category) => {
            const categoryVariables = groupedVariables[category] || [];
            const filteredVars = categoryVariables.filter(v => 
              !searchTerm || 
              v.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
              v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              v.description.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (filteredVars.length === 0 && searchTerm) return null;

            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                    <Badge variant="outline">{filteredVars.length} variables</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Droppable droppableId={category}>
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                        {filteredVars.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">
                            No hay variables en esta categoría.
                          </p>
                        ) : (
                          filteredVars.map((variable, index) => {
                            const Icon = getVariableIcon(variable.data_type);
                            return (
                              <Draggable key={variable.id} draggableId={variable.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`p-4 border rounded-lg bg-white ${
                                      snapshot.isDragging ? 'shadow-lg' : ''
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3 flex-1">
                                        <div {...provided.dragHandleProps}>
                                          <GripVertical className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <Icon className="h-5 w-5 text-blue-600" />
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium">{variable.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {variable.key}
                                            </Badge>
                                            <Badge className="text-xs">
                                              {DATA_TYPES.find(t => t.value === variable.data_type)?.label}
                                            </Badge>
                                            {variable.is_required && (
                                              <Badge variant="destructive" className="text-xs">
                                                Requerida
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-sm text-muted-foreground">{variable.description}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <div className="px-3 py-1 bg-gray-50 rounded">
                                          {renderVariablePreview(variable)}
                                        </div>
                                        <Button variant="outline" size="sm">
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm">
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>¿Eliminar variable?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Esta acción eliminará permanentemente la variable "{variable.name}".
                                                Esta acción no se puede deshacer.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDelete(variable.id)}>
                                                Eliminar
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}