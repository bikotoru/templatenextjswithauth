'use client';

import { useState, useEffect } from 'react';
import { CorporateThemeSelector } from '@/components/corporate-theme-selector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Palette, 
  Settings, 
  FileImage, 
  Upload,
  Save
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
  data_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  is_required: boolean;
  is_editable: boolean;
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
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [currentOrganization]);

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tema" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Tema</span>
            </TabsTrigger>
            <TabsTrigger value="variables" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Variables</span>
            </TabsTrigger>
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

          {/* Tab 3: Branding */}
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