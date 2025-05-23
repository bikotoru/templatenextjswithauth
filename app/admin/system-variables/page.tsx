'use client';

import { useState, useEffect } from 'react';
import { Plus, Hash, Settings2, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import { GroupedVariableList } from '@/app/(module)/admin/system-variables/components/grouped-variable-list';
import { GroupManager } from '@/app/(module)/admin/system-variables/components/group-manager';
import { IncrementalWizard } from '@/app/(module)/admin/system-variables/components/incremental-wizard';
import { VariableForm } from '@/app/(module)/admin/system-variables/components/variable-form';
import { SystemVariable, SystemVariableGroup } from '@/app/(module)/admin/system-variables/types';
import { SystemVariableFrontendService } from '@/app/(module)/admin/system-variables/services/frontend.service';
import { SystemVariableGroupsFrontendService } from '@/app/(module)/admin/system-variables/services/groups.frontend.service';
import { useAuth } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

export default function SystemVariablesPage() {
  const { hasPermission } = useAuth();
  const [variables, setVariables] = useState<SystemVariable[]>([]);
  const [groups, setGroups] = useState<SystemVariableGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<SystemVariable | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('variables');

  const canCreateVariables = hasPermission('system_variables:create');
  const canManageGroups = hasPermission('system_variables:groups:manage');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadVariables(),
      loadGroups()
    ]);
  };

  const loadVariables = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await SystemVariableFrontendService.getAll();
      setVariables(result.variables || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar variables');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async () => {
    if (!canManageGroups) return;
    
    try {
      const result = await SystemVariableGroupsFrontendService.getAll({ active: true });
      setGroups(result.groups || []);
    } catch (err) {
      console.error('Error loading groups:', err);
    }
  };

  const handleCreateVariable = () => {
    setSelectedVariable(undefined);
    setIsFormOpen(true);
  };

  const handleCreateIncremental = () => {
    setIsWizardOpen(true);
  };

  const handleEditVariable = (variable: SystemVariable) => {
    setSelectedVariable(variable);
    setIsFormOpen(true);
  };

  const handleDeleteVariable = async (variable: SystemVariable) => {
    if (!confirm(`¿Está seguro de eliminar la variable "${variable.display_name}"?`)) {
      return;
    }

    try {
      await SystemVariableFrontendService.delete(variable.id);
      toast.success('Variable eliminada correctamente');
      await loadVariables();
    } catch (error) {
      console.error('Error deleting variable:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar variable');
    }
  };

  const handleGenerateNumber = async (variable: SystemVariable) => {
    try {
      const result = await SystemVariableFrontendService.generateNumber(variable.variable_key);
      toast.success(`Número generado: ${result.generated_code}`);
    } catch (error) {
      console.error('Error generating number:', error);
      toast.error(error instanceof Error ? error.message : 'Error al generar número');
    }
  };

  const handleSetValue = (variable: SystemVariable) => {
    // TODO: Implementar modal para establecer valor
    toast.info('Función de establecer valor en desarrollo');
  };

  const handleFormSave = () => {
    setIsFormOpen(false);
    setSelectedVariable(undefined);
    loadVariables();
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setSelectedVariable(undefined);
  };

  const handleWizardSuccess = () => {
    loadVariables();
  };

  const handleGroupsChange = () => {
    loadGroups();
    loadVariables(); // Recargar variables para actualizar los grupos
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Variables del Sistema</h1>
            <p className="text-muted-foreground">
              Administre las variables de configuración y numeración automática del sistema
            </p>
          </div>
          <div className="flex gap-2">
            {canCreateVariables && (
              <>
                <Button onClick={handleCreateIncremental} variant="outline">
                  <Hash className="w-4 h-4 mr-2" />
                  Wizard Incremental
                </Button>
                <Button onClick={handleCreateVariable}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Variable
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="variables" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Variables
            </TabsTrigger>
            {canManageGroups && (
              <TabsTrigger value="groups" className="flex items-center gap-2">
                <Folder className="w-4 h-4" />
                Grupos
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="variables" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Variables Configuradas
                </CardTitle>
                <CardDescription>
                  Variables del sistema organizadas por grupos. Use variables incrementales para 
                  numeración automática de documentos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="text-center py-8">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button onClick={loadVariables} variant="outline">
                      Reintentar
                    </Button>
                  </div>
                ) : (
                  <GroupedVariableList
                    variables={variables}
                    groups={groups}
                    isLoading={isLoading}
                    onEdit={handleEditVariable}
                    onDelete={handleDeleteVariable}
                    onGenerate={handleGenerateNumber}
                    onSetValue={handleSetValue}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canManageGroups && (
            <TabsContent value="groups">
              <GroupManager onGroupsChange={handleGroupsChange} />
            </TabsContent>
          )}
        </Tabs>

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedVariable ? 'Editar Variable' : 'Nueva Variable'}
              </DialogTitle>
            </DialogHeader>
            <VariableForm
              variable={selectedVariable}
              groups={groups}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>

        {/* Incremental Wizard */}
        <IncrementalWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={handleWizardSuccess}
          groups={groups}
        />
      </div>
      <Toaster />
    </DashboardLayout>
  );
}