'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CorporateThemeSelector } from '@/components/corporate-theme-selector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Palette, 
  Settings, 
  FileImage, 
  Upload,
  Save,
  Wrench,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';

interface SystemVariable {
  id: string;
  key: string;
  name: string;
  description: string;
  default_value: string;
  data_type: 'string' | 'number' | 'boolean' | 'json' | 'autoincremental';
  category: string;
  is_required: boolean;
  is_editable: boolean;
  group_id?: number;
  group_name?: string;
  config?: any;
}

interface VariableGroup {
  id: number;
  name: string;
  description: string;
  organization_id?: string;
  active: boolean;
  variables?: SystemVariable[];
}

interface OrganizationVariable {
  id: string;
  system_variable_id: string;
  value: string;
}

export default function PersonalizacionPage() {
  const { currentOrganization, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [systemVariables, setSystemVariables] = useState<SystemVariable[]>([]);
  const [orgVariables, setOrgVariables] = useState<Record<string, string>>({});
  
  // Variables designer state
  const [variableGroups, setVariableGroups] = useState<VariableGroup[]>([]);
  const [allSystemVariables, setAllSystemVariables] = useState<SystemVariable[]>([]);
  const [showVariableForm, setShowVariableForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingVariable, setEditingVariable] = useState<SystemVariable | null>(null);
  const [editingGroup, setEditingGroup] = useState<VariableGroup | null>(null);
  
  // Estados para branding
  const [brandingConfig, setBrandingConfig] = useState({
    logo: currentOrganization?.logo || '',
    favicon: ''
  });

  // Fetch system variables and organization values
  useEffect(() => {
    const fetchData = async () => {
      if (!currentOrganization) return;
      
      try {
        // Fetch system variables
        const sysVarResponse = await fetch('/api/admin/system-variables');
        if (sysVarResponse.ok) {
          const sysVars = await sysVarResponse.json();
          setSystemVariables(sysVars.filter((v: SystemVariable) => v.is_editable));
          setAllSystemVariables(sysVars); // For variables designer
        }

        // Fetch organization variable values
        const orgVarResponse = await fetch(`/api/organizations/${currentOrganization.id}/variables`);
        if (orgVarResponse.ok) {
          const orgVars = await orgVarResponse.json();
          const varMap: Record<string, string> = {};
          orgVars.forEach((orgVar: OrganizationVariable & { system_variable: SystemVariable }) => {
            varMap[orgVar.system_variable.key] = orgVar.value;
          });
          setOrgVariables(varMap);
        }
        
        // Fetch variable groups (for designer)
        if (hasPermission('variables:manage')) {
          const groupsResponse = await fetch('/api/admin/variable-groups');
          if (groupsResponse.ok) {
            const groups = await groupsResponse.json();
            setVariableGroups(groups);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [currentOrganization, hasPermission]);

  // Optimized state update functions
  const updateGroupField = useCallback((field: keyof VariableGroup, value: any) => {
    setEditingGroup(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  const updateVariableField = useCallback((field: keyof SystemVariable, value: any) => {
    setEditingVariable(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  const updateVariableConfig = useCallback((field: string, value: any) => {
    setEditingVariable(prev => prev ? {
      ...prev,
      config: { ...(prev.config || {}), [field]: value }
    } : null);
  }, []);

  // Memoized validations to prevent recalculations
  const isVariableValid = useMemo(() => {
    if (!editingVariable) return false;
    
    const basicValid = editingVariable.key && editingVariable.name && editingVariable.description;
    
    if (editingVariable.data_type === 'autoincremental') {
      const configValid = editingVariable.config?.suffix && 
                         editingVariable.config?.digits && 
                         editingVariable.config.digits >= 1 && 
                         editingVariable.config.digits <= 20;
      return basicValid && configValid;
    }
    
    return basicValid;
  }, [editingVariable]);

  const isGroupValid = useMemo(() => {
    return editingGroup?.name && editingGroup.name.trim().length > 0;
  }, [editingGroup]);

  // Variable Groups Functions
  const handleCreateGroup = useCallback(async () => {
    if (!editingGroup?.name) {
      toast.error('El nombre del grupo es requerido');
      return;
    }

    try {
      const response = await fetch('/api/admin/variable-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingGroup.name,
          description: editingGroup.description
        })
      });

      if (response.ok) {
        toast.success('Grupo creado correctamente');
        setShowGroupForm(false);
        setEditingGroup(null);
        // Refresh groups
        const groupsResponse = await fetch('/api/admin/variable-groups');
        if (groupsResponse.ok) {
          const groups = await groupsResponse.json();
          setVariableGroups(groups);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al crear el grupo');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Error al crear el grupo');
    }
  }, [editingGroup]);

  const handleUpdateGroup = useCallback(async () => {
    if (!editingGroup?.name || !editingGroup.id) {
      toast.error('Datos de grupo inválidos');
      return;
    }

    try {
      const response = await fetch(`/api/admin/variable-groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingGroup.name,
          description: editingGroup.description
        })
      });

      if (response.ok) {
        toast.success('Grupo actualizado correctamente');
        setShowGroupForm(false);
        setEditingGroup(null);
        // Refresh groups
        const groupsResponse = await fetch('/api/admin/variable-groups');
        if (groupsResponse.ok) {
          const groups = await groupsResponse.json();
          setVariableGroups(groups);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al actualizar el grupo');
      }
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Error al actualizar el grupo');
    }
  }, [editingGroup]);

  const handleDeleteGroup = async (groupId: number) => {
    try {
      const response = await fetch(`/api/admin/variable-groups/${groupId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Grupo eliminado correctamente');
        // Refresh groups and variables
        const groupsResponse = await fetch('/api/admin/variable-groups');
        const varsResponse = await fetch('/api/admin/system-variables');
        if (groupsResponse.ok && varsResponse.ok) {
          const groups = await groupsResponse.json();
          const vars = await varsResponse.json();
          setVariableGroups(groups);
          setAllSystemVariables(vars);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al eliminar el grupo');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Error al eliminar el grupo');
    }
  };

  // Variables Functions
  const handleCreateVariable = async () => {
    // Validaciones básicas
    if (!editingVariable?.key || !editingVariable?.name || !editingVariable?.description) {
      toast.error('Campos requeridos: Clave, Nombre y Descripción');
      return;
    }

    // Validaciones específicas para autoincremental
    if (editingVariable.data_type === 'autoincremental') {
      if (!editingVariable.config?.suffix) {
        toast.error('Variables autoincrementales requieren un sufijo');
        return;
      }
      if (!editingVariable.config?.digits || editingVariable.config.digits < 1 || editingVariable.config.digits > 20) {
        toast.error('El número de dígitos debe ser entre 1 y 20');
        return;
      }
    }

    // Validación de clave (solo letras, números y guiones bajos)
    if (!/^[a-zA-Z0-9_]+$/.test(editingVariable.key)) {
      toast.error('La clave solo puede contener letras, números y guiones bajos');
      return;
    }

    try {
      const response = await fetch('/api/admin/system-variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVariable)
      });

      if (response.ok) {
        toast.success('Variable creada correctamente');
        setShowVariableForm(false);
        setEditingVariable(null);
        // Refresh variables
        const varsResponse = await fetch('/api/admin/system-variables');
        if (varsResponse.ok) {
          const vars = await varsResponse.json();
          setAllSystemVariables(vars);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al crear la variable');
      }
    } catch (error) {
      console.error('Error creating variable:', error);
      toast.error('Error al crear la variable');
    }
  };

  const handleUpdateVariable = async () => {
    // Validaciones básicas
    if (!editingVariable?.id || !editingVariable?.name || !editingVariable?.description) {
      toast.error('Campos requeridos: Nombre y Descripción');
      return;
    }

    // Validaciones específicas para autoincremental
    if (editingVariable.data_type === 'autoincremental') {
      if (!editingVariable.config?.suffix) {
        toast.error('Variables autoincrementales requieren un sufijo');
        return;
      }
      if (!editingVariable.config?.digits || editingVariable.config.digits < 1 || editingVariable.config.digits > 20) {
        toast.error('El número de dígitos debe ser entre 1 y 20');
        return;
      }
    }

    try {
      const response = await fetch(`/api/admin/system-variables/${editingVariable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVariable)
      });

      if (response.ok) {
        toast.success('Variable actualizada correctamente');
        setShowVariableForm(false);
        setEditingVariable(null);
        // Refresh variables
        const varsResponse = await fetch('/api/admin/system-variables');
        if (varsResponse.ok) {
          const vars = await varsResponse.json();
          setAllSystemVariables(vars);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al actualizar la variable');
      }
    } catch (error) {
      console.error('Error updating variable:', error);
      toast.error('Error al actualizar la variable');
    }
  };

  const handleDeleteVariable = async (variableId: string) => {
    try {
      const response = await fetch(`/api/admin/system-variables/${variableId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Variable eliminada correctamente');
        // Refresh variables
        const varsResponse = await fetch('/api/admin/system-variables');
        if (varsResponse.ok) {
          const vars = await varsResponse.json();
          setAllSystemVariables(vars);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al eliminar la variable');
      }
    } catch (error) {
      console.error('Error deleting variable:', error);
      toast.error('Error al eliminar la variable');
    }
  };

  const handleSaveVariable = async (variableKey: string, value: any) => {
    if (!currentOrganization) return;
    
    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variable_key: variableKey,
          value: value.toString()
        }),
      });

      if (response.ok) {
        setOrgVariables(prev => ({ ...prev, [variableKey]: value.toString() }));
        toast.success('Variable actualizada correctamente');
      } else {
        toast.error('Error al guardar la variable');
      }
    } catch (error) {
      console.error('Error saving variable:', error);
      toast.error('Error al guardar la variable');
    }
  };

  const handleSaveBranding = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}/branding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(brandingConfig),
      });

      if (response.ok) {
        toast.success('Branding actualizado correctamente');
      } else {
        toast.error('Error al guardar el branding');
      }
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error('Error al guardar el branding');
    } finally {
      setLoading(false);
    }
  };

  // Group variables by category
  const groupedVariables = systemVariables.reduce((groups, variable) => {
    const category = variable.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(variable);
    return groups;
  }, {} as Record<string, SystemVariable[]>);

  const renderVariableInput = (variable: SystemVariable) => {
    const value = orgVariables[variable.key] || variable.default_value;
    
    switch (variable.data_type) {
      case 'boolean':
        return (
          <Switch
            checked={value === 'true'}
            onCheckedChange={(checked) => handleSaveVariable(variable.key, checked)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleSaveVariable(variable.key, e.target.value)}
            className="w-32 text-sm"
          />
        );
      case 'json':
        return (
          <Input
            value={value}
            onChange={(e) => handleSaveVariable(variable.key, e.target.value)}
            placeholder="JSON"
            className="w-48 text-sm font-mono"
          />
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleSaveVariable(variable.key, e.target.value)}
            className="w-48 text-sm"
          />
        );
    }
  };

  if (!currentOrganization) {
    return <div>Cargando...</div>;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Personalización</h1>
          <p className="text-muted-foreground">
            Configura y personaliza tu organización según tus necesidades.
          </p>
        </div>

        <Tabs defaultValue="tema" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tema" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Tema</span>
            </TabsTrigger>
            <TabsTrigger value="variables" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Variables</span>
            </TabsTrigger>
            {hasPermission('variables:manage') && (
              <TabsTrigger value="designer" className="flex items-center space-x-2">
                <Wrench className="h-4 w-4" />
                <span>Diseñador</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="branding" className="flex items-center space-x-2">
              <FileImage className="h-4 w-4" />
              <span>Branding</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Tema Corporativo */}
          <TabsContent value="tema" className="space-y-6">
            {hasPermission('themes:view') ? (
              <CorporateThemeSelector />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground">
                    No tienes permisos para ver la configuración de temas.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 2: Variables de Organización */}
          <TabsContent value="variables" className="space-y-6">
            {Object.keys(groupedVariables).length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-center">
                    No hay variables configurables disponibles.
                  </p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedVariables).map(([categoryName, variables]) => (
                <Card key={categoryName}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="h-5 w-5" />
                      <span>{categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}</span>
                    </CardTitle>
                    <CardDescription>
                      Configuración específica para {categoryName.toLowerCase()}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {variables.map((variable) => (
                      <div key={variable.key} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Label className="font-medium">{variable.name}</Label>
                            <Badge variant="outline" className="text-xs">
                              {variable.key}
                            </Badge>
                            {variable.is_required && (
                              <Badge variant="destructive" className="text-xs">
                                Requerida
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {variable.description}
                          </p>
                        </div>
                        <div className="ml-4">
                          {renderVariableInput(variable)}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Tab 3: Variables Designer (Solo Super Admin) */}
          {hasPermission('variables:manage') && (
            <TabsContent value="designer" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Diseñador de Variables</h2>
                  <p className="text-muted-foreground">
                    Crea y gestiona grupos de variables y variables del sistema.
                  </p>
                </div>
                <div className="space-x-2">
                  <Button 
                    onClick={() => {
                      setEditingGroup({ name: '', description: '' } as VariableGroup);
                      setShowGroupForm(true);
                    }} 
                    variant="outline"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Grupo
                  </Button>
                  <Button 
                    onClick={() => {
                      setEditingVariable({
                        key: '',
                        name: '',
                        description: '',
                        data_type: 'string',
                        category: 'general',
                        is_required: false,
                        is_editable: true,
                        default_value: '',
                        config: {}
                      } as SystemVariable);
                      setShowVariableForm(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Variable
                  </Button>
                </div>
              </div>

              {/* Variable Groups */}
              <div className="space-y-4">
                {variableGroups.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Wrench className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        No hay grupos de variables
                      </p>
                      <p className="text-gray-500 mb-6">
                        Comienza creando tu primer grupo de variables para organizar la configuración.
                      </p>
                      <Button 
                        onClick={() => {
                          setEditingGroup({ name: '', description: '' } as VariableGroup);
                          setShowGroupForm(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Primer Grupo
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  variableGroups.map((group) => {
                    const groupVariables = allSystemVariables.filter(v => v.group_id === group.id);
                    
                    return (
                      <Card key={group.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="flex items-center space-x-2">
                                <Settings className="h-5 w-5" />
                                <span>{group.name}</span>
                                <Badge variant="outline" className="ml-2">
                                  {groupVariables.length} variables
                                </Badge>
                              </CardTitle>
                              <CardDescription>{group.description}</CardDescription>
                            </div>
                            <div className="space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setEditingGroup(group);
                                  setShowGroupForm(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar grupo?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción eliminará permanentemente el grupo "{group.name}" y todas sus variables asociadas. Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteGroup(group.id)}>
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {groupVariables.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                              <p className="text-gray-500 mb-4">
                                Este grupo no tiene variables aún
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setEditingVariable({
                                    group_id: group.id,
                                    key: '',
                                    name: '',
                                    description: '',
                                    data_type: 'string',
                                    category: 'general',
                                    is_required: false,
                                    is_editable: true,
                                    default_value: '',
                                    config: {}
                                  } as SystemVariable);
                                  setShowVariableForm(true);
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Agregar Variable
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {groupVariables.map((variable) => (
                                <div 
                                  key={variable.id} 
                                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium">{variable.name}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {variable.key}
                                      </Badge>
                                      <Badge 
                                        variant={variable.data_type === 'autoincremental' ? 'default' : 'outline'} 
                                        className="text-xs"
                                      >
                                        {variable.data_type}
                                      </Badge>
                                      {variable.is_required && (
                                        <Badge variant="destructive" className="text-xs">
                                          Requerida
                                        </Badge>
                                      )}
                                      {!variable.is_editable && (
                                        <Badge variant="secondary" className="text-xs">
                                          Solo lectura
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {variable.description}
                                    </p>
                                    {variable.data_type === 'autoincremental' && variable.config && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        Formato: {variable.config.suffix}{'0'.repeat(variable.config.digits || 8)}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        setEditingVariable(variable);
                                        setShowVariableForm(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-red-600">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>¿Eliminar variable?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta acción eliminará permanentemente la variable "{variable.name}". Esta acción no se puede deshacer.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteVariable(variable.id)}>
                                            Eliminar
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              ))}
                              <div className="pt-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => {
                                    setEditingVariable({
                                      group_id: group.id,
                                      key: '',
                                      name: '',
                                      description: '',
                                      data_type: 'string',
                                      category: 'general',
                                      is_required: false,
                                      is_editable: true,
                                      default_value: '',
                                      config: {}
                                    } as SystemVariable);
                                    setShowVariableForm(true);
                                  }}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Agregar Variable a {group.name}
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}

                {/* Variables sin grupo */}
                {allSystemVariables.filter(v => !v.group_id).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="h-5 w-5" />
                        <span>Variables sin grupo</span>
                        <Badge variant="outline" className="ml-2">
                          {allSystemVariables.filter(v => !v.group_id).length} variables
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Variables que no han sido asignadas a ningún grupo
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {allSystemVariables.filter(v => !v.group_id).map((variable) => (
                          <div 
                            key={variable.id} 
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{variable.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {variable.key}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {variable.data_type}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {variable.description}
                              </p>
                            </div>
                            <div className="space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setEditingVariable(variable);
                                  setShowVariableForm(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar variable?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción eliminará permanentemente la variable "{variable.name}". Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteVariable(variable.id)}>
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Group Form Modal */}
              <Dialog open={showGroupForm} onOpenChange={setShowGroupForm}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingGroup?.id ? 'Editar Grupo' : 'Nuevo Grupo'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingGroup?.id 
                        ? 'Modifica la información del grupo de variables.' 
                        : 'Crea un nuevo grupo para organizar las variables.'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre del Grupo *</Label>
                      <Input
                        value={editingGroup?.name || ''}
                        onChange={(e) => updateGroupField('name', e.target.value)}
                        placeholder="Ej: Configuración General"
                      />
                    </div>
                    <div>
                      <Label>Descripción</Label>
                      <Textarea
                        value={editingGroup?.description || ''}
                        onChange={(e) => updateGroupField('description', e.target.value)}
                        placeholder="Describe el propósito de este grupo"
                        rows={3}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowGroupForm(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={editingGroup?.id ? handleUpdateGroup : handleCreateGroup}
                      disabled={!isGroupValid}
                    >
                      {editingGroup?.id ? 'Actualizar' : 'Crear'} Grupo
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Variable Form Modal */}
              <Dialog open={showVariableForm} onOpenChange={setShowVariableForm}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingVariable?.id ? 'Editar Variable' : 'Nueva Variable'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingVariable?.id 
                        ? 'Modifica la configuración de la variable.' 
                        : 'Crea una nueva variable del sistema.'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Información Básica</h3>
                      
                      <div>
                        <Label>Clave de Variable *</Label>
                        <Input
                          value={editingVariable?.key || ''}
                          onChange={(e) => updateVariableField('key', e.target.value)}
                          placeholder="ej: company_name"
                          disabled={!!editingVariable?.id} // No editable if editing
                          className={!editingVariable?.key && !editingVariable?.id ? 'border-red-300' : ''}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {editingVariable?.id ? 'La clave no se puede modificar' : 'Solo letras, números y guiones bajos'}
                        </p>
                        {!editingVariable?.key && !editingVariable?.id && (
                          <p className="text-xs text-red-500 mt-1">Clave es requerida</p>
                        )}
                      </div>

                      <div>
                        <Label>Nombre *</Label>
                        <Input
                          value={editingVariable?.name || ''}
                          onChange={(e) => updateVariableField('name', e.target.value)}
                          placeholder="ej: Nombre de la Empresa"
                          className={!editingVariable?.name ? 'border-red-300' : ''}
                        />
                        {!editingVariable?.name && (
                          <p className="text-xs text-red-500 mt-1">Nombre es requerido</p>
                        )}
                      </div>

                      <div>
                        <Label>Descripción *</Label>
                        <Textarea
                          value={editingVariable?.description || ''}
                          onChange={(e) => updateVariableField('description', e.target.value)}
                          placeholder="Describe para qué sirve esta variable"
                          rows={3}
                          className={!editingVariable?.description ? 'border-red-300' : ''}
                        />
                        {!editingVariable?.description && (
                          <p className="text-xs text-red-500 mt-1">Descripción es requerida</p>
                        )}
                      </div>

                      <div>
                        <Label>Grupo</Label>
                        <Select 
                          value={editingVariable?.group_id?.toString() || 'no-group'} 
                          onValueChange={(value) => setEditingVariable(prev => prev ? {...prev, group_id: value === 'no-group' ? undefined : parseInt(value)} : null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sin grupo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no-group">Sin grupo</SelectItem>
                            {variableGroups.map((group) => (
                              <SelectItem key={group.id} value={group.id.toString()}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Type & Config */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Configuración</h3>
                      
                      <div>
                        <Label>Tipo de Variable *</Label>
                        <Select 
                          value={editingVariable?.data_type} 
                          onValueChange={(value: 'string' | 'number' | 'boolean' | 'json' | 'autoincremental') => 
                            setEditingVariable(prev => prev ? {
                              ...prev, 
                              data_type: value, 
                              config: value === 'autoincremental' ? { suffix: '', digits: 8 } : {}
                            } : null)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">Texto</SelectItem>
                            <SelectItem value="number">Número</SelectItem>
                            <SelectItem value="boolean">Verdadero/Falso</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                            <SelectItem value="autoincremental">Autoincremental</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Categoría *</Label>
                        <Select 
                          value={editingVariable?.category} 
                          onValueChange={(value) => setEditingVariable(prev => prev ? {...prev, category: value} : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="branding">Branding</SelectItem>
                            <SelectItem value="security">Seguridad</SelectItem>
                            <SelectItem value="notifications">Notificaciones</SelectItem>
                            <SelectItem value="ui">Interfaz</SelectItem>
                            <SelectItem value="integrations">Integraciones</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Valor por Defecto</Label>
                        <Input
                          value={editingVariable?.default_value || ''}
                          onChange={(e) => setEditingVariable(prev => prev ? {...prev, default_value: e.target.value} : null)}
                          placeholder="Valor inicial"
                        />
                      </div>

                      {/* Autoincremental Config */}
                      {editingVariable?.data_type === 'autoincremental' && (
                        <div className="space-y-3 p-3 border rounded-lg bg-blue-50">
                          <h4 className="font-medium text-sm">Configuración Autoincremental</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Sufijo *</Label>
                              <Input
                                value={editingVariable.config?.suffix || ''}
                                onChange={(e) => updateVariableConfig('suffix', e.target.value)}
                                placeholder="INV-"
                                className="text-sm"
                                required
                              />
                              {!editingVariable.config?.suffix && (
                                <p className="text-xs text-red-500 mt-1">Sufijo es requerido</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-xs">Dígitos *</Label>
                              <Input
                                type="number"
                                value={editingVariable.config?.digits || 8}
                                onChange={(e) => updateVariableConfig('digits', parseInt(e.target.value) || 8)}
                                min="1"
                                max="20"
                                className="text-sm"
                                required
                              />
                              {(!editingVariable.config?.digits || editingVariable.config.digits < 1 || editingVariable.config.digits > 20) && (
                                <p className="text-xs text-red-500 mt-1">Debe ser entre 1 y 20</p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-blue-600">
                            Formato de ejemplo: {editingVariable.config?.suffix || 'XXX'}{'0'.repeat(Math.max(0, (editingVariable.config?.digits || 8) - 1))}1
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 text-sm">
                          <Switch 
                            checked={editingVariable?.is_required || false}
                            onCheckedChange={(checked) => setEditingVariable(prev => prev ? {...prev, is_required: checked} : null)}
                          />
                          <span>Variable requerida</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm">
                          <Switch 
                            checked={editingVariable?.is_editable !== false}
                            onCheckedChange={(checked) => setEditingVariable(prev => prev ? {...prev, is_editable: checked} : null)}
                          />
                          <span>Editable por organizaciones</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowVariableForm(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={editingVariable?.id ? handleUpdateVariable : handleCreateVariable}
                      disabled={!isVariableValid}
                    >
                      {editingVariable?.id ? 'Actualizar' : 'Crear'} Variable
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          )}

          {/* Tab 4: Branding */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Identidad Visual</CardTitle>
                <CardDescription>
                  Personaliza el logo y favicon de tu organización.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label>Logo de la Organización</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {brandingConfig.logo ? (
                        <div className="space-y-2">
                          <img src={brandingConfig.logo} alt="Logo" className="mx-auto max-h-20" />
                          <Button variant="outline" size="sm">
                            <Upload className="mr-2 h-4 w-4" />
                            Cambiar Logo
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <FileImage className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="text-sm text-gray-500">
                            Arrastra un archivo o haz click para subir
                          </p>
                          <Button variant="outline" size="sm">
                            <Upload className="mr-2 h-4 w-4" />
                            Subir Logo
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recomendado: PNG o SVG, máximo 2MB, fondo transparente
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Label>Favicon</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {brandingConfig.favicon ? (
                        <div className="space-y-2">
                          <img src={brandingConfig.favicon} alt="Favicon" className="mx-auto w-8 h-8" />
                          <Button variant="outline" size="sm">
                            <Upload className="mr-2 h-4 w-4" />
                            Cambiar Favicon
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="mx-auto h-8 w-8 bg-gray-200 rounded border-2 border-gray-300 flex items-center justify-center">
                            <span className="text-xs text-gray-500">ICO</span>
                          </div>
                          <p className="text-sm text-gray-500">
                            Favicon del sitio web
                          </p>
                          <Button variant="outline" size="sm">
                            <Upload className="mr-2 h-4 w-4" />
                            Subir Favicon
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recomendado: ICO o PNG, 32x32px, máximo 1MB
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveBranding} disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? 'Guardando...' : 'Guardar Branding'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}