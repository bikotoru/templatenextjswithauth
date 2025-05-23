'use client';

import { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, Hash, Text, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CreateVariableRequest, 
  VariableCategory, 
  ResetFrequency,
  VARIABLE_CATEGORY_LABELS,
  SystemVariableGroup
} from '../types';
import { SystemVariableFrontendService } from '../services/frontend.service';
import { SystemVariableGroupsFrontendService } from '../services/groups.frontend.service';
import { toast } from 'sonner';

interface IncrementalWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groups?: SystemVariableGroup[];
}

interface WizardData {
  // Paso 1: Información básica
  variable_key: string;
  display_name: string;
  description: string;
  category: VariableCategory | '';
  group_id: number | '';
  
  // Paso 2: Configuración incremental
  prefix: string;
  number_length: number;
  current_number: number;
  reset_frequency: ResetFrequency;
  
  // Paso 3: Variable suffix (opcional)
  create_suffix: boolean;
  suffix_key: string;
  suffix_name: string;
  
  // Configuración avanzada
  is_editable: boolean;
  system_level_only: boolean;
}

const STEPS = [
  { id: 1, title: 'Información Básica', description: 'Datos principales de la variable' },
  { id: 2, title: 'Configuración Incremental', description: 'Formato y numeración' },
  { id: 3, title: 'Variable Suffix (Opcional)', description: 'Texto adicional configurable' },
  { id: 4, title: 'Confirmación', description: 'Revisar configuración' }
];

export function IncrementalWizard({ isOpen, onClose, onSuccess, groups = [] }: IncrementalWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<WizardData>({
    variable_key: '',
    display_name: '',
    description: '',
    category: '',
    group_id: '',
    prefix: '',
    number_length: 8,
    current_number: 1,
    reset_frequency: ResetFrequency.NEVER,
    create_suffix: false,
    suffix_key: '',
    suffix_name: '',
    is_editable: true,
    system_level_only: false
  });

  const updateData = (updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const generateKeys = (displayName: string) => {
    const baseKey = displayName
      .toUpperCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
    
    if (!data.variable_key) {
      updateData({ variable_key: baseKey });
    }
    
    if (data.create_suffix && !data.suffix_key) {
      updateData({ suffix_key: `${baseKey}_SUFFIX` });
    }
    
    if (data.create_suffix && !data.suffix_name) {
      updateData({ suffix_name: `Sufijo para ${displayName}` });
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(data.variable_key && data.display_name && data.category);
      case 2:
        return !!(data.prefix && data.number_length > 0);
      case 3:
        return !data.create_suffix || !!(data.suffix_key && data.suffix_name);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const request: CreateVariableRequest = {
        variable_key: data.variable_key,
        display_name: data.display_name,
        variable_type: 'incremental' as any,
        description: data.description,
        category: data.category as VariableCategory,
        group_id: data.group_id ? Number(data.group_id) : undefined,
        is_editable: data.is_editable,
        edit_permission: data.is_editable ? `system_variable:${data.variable_key}:edit` : undefined,
        system_level_only: data.system_level_only,
        incremental_config: {
          prefix: data.prefix,
          current_number: data.current_number,
          number_length: data.number_length,
          reset_frequency: data.reset_frequency
        },
        create_suffix_variable: data.create_suffix,
        suffix_variable_key: data.create_suffix ? data.suffix_key : undefined,
        suffix_variable_name: data.create_suffix ? data.suffix_name : undefined
      };

      await SystemVariableFrontendService.create(request);
      
      toast.success(
        data.create_suffix 
          ? 'Variables creadas correctamente (incremental + suffix)'
          : 'Variable incremental creada correctamente'
      );
      
      onSuccess();
      onClose();
      
      // Reset wizard
      setCurrentStep(1);
      setData({
        variable_key: '',
        display_name: '',
        description: '',
        category: '',
        group_id: '',
        prefix: '',
        number_length: 8,
        current_number: 1,
        reset_frequency: ResetFrequency.NEVER,
        create_suffix: false,
        suffix_key: '',
        suffix_name: '',
        is_editable: true,
        system_level_only: false
      });
      
    } catch (error) {
      console.error('Error creating variable:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear variable');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePreview = () => {
    const number = data.current_number.toString().padStart(data.number_length, '0');
    return `${data.prefix}${number}`;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="display_name">Nombre de la Variable *</Label>
              <Input
                id="display_name"
                value={data.display_name}
                onChange={(e) => {
                  updateData({ display_name: e.target.value });
                  generateKeys(e.target.value);
                }}
                placeholder="Ej: Numeración de Órdenes de Compra"
              />
            </div>
            
            <div>
              <Label htmlFor="variable_key">Clave de la Variable *</Label>
              <Input
                id="variable_key"
                value={data.variable_key}
                onChange={(e) => updateData({ variable_key: e.target.value.toUpperCase() })}
                placeholder="Ej: PURCHASE_ORDER_NUMBER"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={data.description}
                onChange={(e) => updateData({ description: e.target.value })}
                placeholder="Describe el propósito de esta variable..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="category">Categoría *</Label>
              <Select value={data.category} onValueChange={(value) => updateData({ category: value as VariableCategory })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VARIABLE_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {groups.length > 0 && (
              <div>
                <Label htmlFor="group_id">Grupo (Opcional)</Label>
                <Select value={data.group_id.toString()} onValueChange={(value) => updateData({ group_id: value ? Number(value) : '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin grupo</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="prefix">Prefijo *</Label>
              <Input
                id="prefix"
                value={data.prefix}
                onChange={(e) => updateData({ prefix: e.target.value })}
                placeholder="Ej: OC-"
              />
            </div>
            
            <div>
              <Label htmlFor="number_length">Longitud del Número *</Label>
              <Input
                id="number_length"
                type="number"
                min="1"
                max="20"
                value={data.number_length}
                onChange={(e) => updateData({ number_length: parseInt(e.target.value) || 8 })}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Cantidad de dígitos (con ceros a la izquierda)
              </p>
            </div>
            
            <div>
              <Label htmlFor="current_number">Número Inicial</Label>
              <Input
                id="current_number"
                type="number"
                min="0"
                value={data.current_number}
                onChange={(e) => updateData({ current_number: parseInt(e.target.value) || 1 })}
              />
            </div>
            
            <div>
              <Label htmlFor="reset_frequency">Frecuencia de Reinicio</Label>
              <Select value={data.reset_frequency} onValueChange={(value) => updateData({ reset_frequency: value as ResetFrequency })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ResetFrequency.NEVER}>Nunca</SelectItem>
                  <SelectItem value={ResetFrequency.YEARLY}>Anual</SelectItem>
                  <SelectItem value={ResetFrequency.MONTHLY}>Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {data.prefix && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Vista Previa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-mono bg-muted p-3 rounded">
                    {generatePreview()}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="create_suffix"
                checked={data.create_suffix}
                onCheckedChange={(checked) => updateData({ create_suffix: checked })}
              />
              <Label htmlFor="create_suffix">Crear variable para sufijo configurable</Label>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Si activa esta opción, se creará una variable adicional de tipo texto que permitirá 
              configurar un sufijo para los números generados.
            </p>
            
            {data.create_suffix && (
              <>
                <div>
                  <Label htmlFor="suffix_name">Nombre de la Variable Suffix *</Label>
                  <Input
                    id="suffix_name"
                    value={data.suffix_name}
                    onChange={(e) => updateData({ suffix_name: e.target.value })}
                    placeholder="Ej: Sufijo para Órdenes de Compra"
                  />
                </div>
                
                <div>
                  <Label htmlFor="suffix_key">Clave de la Variable Suffix *</Label>
                  <Input
                    id="suffix_key"
                    value={data.suffix_key}
                    onChange={(e) => updateData({ suffix_key: e.target.value.toUpperCase() })}
                    placeholder="Ej: PURCHASE_ORDER_SUFFIX"
                  />
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Text className="w-4 h-4" />
                      Variables que se Crearán
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Incremental</Badge>
                        <span>{data.display_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Texto</Badge>
                        <span>{data.suffix_name}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_editable"
                  checked={data.is_editable}
                  onCheckedChange={(checked) => updateData({ is_editable: checked })}
                />
                <Label htmlFor="is_editable">Permitir edición por organizaciones</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="system_level_only"
                  checked={data.system_level_only}
                  onCheckedChange={(checked) => updateData({ system_level_only: checked })}
                />
                <Label htmlFor="system_level_only">Solo nivel SYSTEM</Label>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Configuración</CardTitle>
                <CardDescription>Revise los datos antes de crear las variables</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Variable Principal</Label>
                  <div className="bg-muted p-3 rounded">
                    <div className="font-medium">{data.display_name}</div>
                    <div className="text-sm text-muted-foreground">{data.variable_key}</div>
                    <div className="text-sm">Formato: {generatePreview()}</div>
                  </div>
                </div>
                
                {data.create_suffix && (
                  <div>
                    <Label>Variable Suffix</Label>
                    <div className="bg-muted p-3 rounded">
                      <div className="font-medium">{data.suffix_name}</div>
                      <div className="text-sm text-muted-foreground">{data.suffix_key}</div>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {data.is_editable && <Badge variant="secondary">Editable</Badge>}
                  {data.system_level_only && <Badge variant="destructive">Solo SYSTEM</Badge>}
                  <Badge variant="outline">{VARIABLE_CATEGORY_LABELS[data.category as VariableCategory]}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asistente para Variable Incremental</DialogTitle>
          <DialogDescription>
            Configure una variable para numeración automática de documentos
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= step.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 h-px mx-2 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">{STEPS[currentStep - 1].title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{STEPS[currentStep - 1].description}</p>
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            
            {currentStep < STEPS.length ? (
              <Button
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
              >
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crear Variable{data.create_suffix ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}