'use client';

import { useState, useEffect } from 'react';
import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import VariableList from '@/app/(module)/admin/system-variables/components/variable-list';
import { VariableForm } from '@/app/(module)/admin/system-variables/components/variable-form';
import { SystemVariable } from '@/app/(module)/admin/system-variables/types';
import { SystemVariableFrontendService } from '@/app/(module)/admin/system-variables/services/frontend.service';

export default function SystemVariablesPage() {
  const [variables, setVariables] = useState<SystemVariable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<SystemVariable | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVariables();
  }, []);

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

  const handleCreateVariable = () => {
    setSelectedVariable(undefined);
    setIsFormOpen(true);
  };

  const handleEditVariable = (variable: SystemVariable) => {
    setSelectedVariable(variable);
    setIsFormOpen(true);
  };

  const handleFormSave = () => {
    setIsFormOpen(false);
    setSelectedVariable(undefined);
    loadVariables(); // Recargar la lista
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setSelectedVariable(undefined);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Variables del Sistema</h1>
          <p className="text-muted-foreground">
            Administre las variables de configuración y numeración automática del sistema
          </p>
        </div>
        <Button onClick={handleCreateVariable}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Variable
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Variables Configuradas
          </CardTitle>
          <CardDescription>
            Lista de todas las variables del sistema configuradas para esta organización.
            Use variables incrementales para numeración automática de documentos.
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
            <VariableList
              variables={variables}
              isLoading={isLoading}
              onEdit={handleEditVariable}
              onRefresh={loadVariables}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedVariable ? 'Editar Variable' : 'Nueva Variable'}
            </DialogTitle>
          </DialogHeader>
          <VariableForm
            variable={selectedVariable}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}