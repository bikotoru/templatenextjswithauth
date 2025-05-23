'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Save, X } from 'lucide-react';
import { 
  SystemVariable, 
  CreateVariableRequest, 
  UpdateVariableRequest,
  VariableType, 
  VariableCategory,
  ResetFrequency,
  VariableValidation
} from '../types';
import { SystemVariableFrontendService } from '../services/frontend.service';

interface VariableFormData {
  variable_key: string;
  display_name: string;
  description: string;
  variable_type: VariableType;
  category: VariableCategory;
  group_id: number | '';
  is_editable: boolean;
  edit_permission: string;
  system_level_only: boolean;
  is_required: boolean;
  is_system: boolean;
  default_value: unknown;
}

interface VariableFormProps {
  variable?: SystemVariable;
  groups?: Array<{ id: number; name: string; display_order: number }>;
  onSave: (variable: SystemVariable) => void;
  onCancel: () => void;
}

export function VariableForm({ variable, groups = [], onSave, onCancel }: VariableFormProps) {
  const [formData, setFormData] = useState<VariableFormData>({
    variable_key: '',
    display_name: '',
    description: '',
    variable_type: VariableType.TEXT,
    category: VariableCategory.SETTINGS,
    group_id: '',
    is_editable: true,
    edit_permission: '',
    system_level_only: false,
    is_required: false,
    is_system: false,
    default_value: null
  });

  const [incrementalConfig, setIncrementalConfig] = useState({
    prefix: '',
    suffix: '',
    number_length: 8,
    current_number: 0,
    reset_frequency: ResetFrequency.NEVER
  });

  const [validationRules, setValidationRules] = useState<VariableValidation[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!variable;

  useEffect(() => {
    if (variable) {
      setFormData({
        variable_key: variable.variable_key,
        display_name: variable.display_name,
        description: variable.description || '',
        variable_type: variable.variable_type,
        category: variable.category || VariableCategory.SETTINGS,
        group_id: variable.group_id || '',
        is_editable: variable.is_editable,
        edit_permission: variable.edit_permission || '',
        system_level_only: variable.system_level_only,
        is_required: variable.is_required,
        is_system: variable.is_system,
        default_value: variable.default_value
      });

      if (variable.incremental_config) {
        setIncrementalConfig({
          prefix: variable.incremental_config.prefix || '',
          suffix: variable.incremental_config.suffix || '',
          number_length: variable.incremental_config.number_length,
          current_number: variable.incremental_config.current_number,
          reset_frequency: variable.incremental_config.reset_frequency || ResetFrequency.NEVER
        });
      }

      if (variable.validation_rules) {
        setValidationRules(variable.validation_rules);
      }
    }
  }, [variable]);

  // Generar automáticamente edit_permission basado en variable_key
  const generateEditPermission = (variableKey: string) => {
    if (!variableKey.trim()) return '';
    return `system_variable:${variableKey}:edit`;
  };

  // Manejar cambios en variable_key
  const handleVariableKeyChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setFormData(prev => ({
      ...prev,
      variable_key: upperValue,
      edit_permission: prev.is_editable ? generateEditPermission(upperValue) : prev.edit_permission
    }));
  };

  // Manejar cambios en is_editable
  const handleEditableChange = (isEditable: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_editable: isEditable,
      edit_permission: isEditable ? generateEditPermission(prev.variable_key) : ''
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.variable_key.trim()) {
      newErrors.variable_key = 'La clave de variable es requerida';
    } else if (!/^[A-Z_][A-Z0-9_]*$/.test(formData.variable_key)) {
      newErrors.variable_key = 'La clave debe contener solo letras mayúsculas, números y guiones bajos, comenzando con letra o guión bajo';
    }

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'El nombre de visualización es requerido';
    }

    if (formData.variable_type === VariableType.INCREMENTAL) {
      if (!incrementalConfig.prefix && !incrementalConfig.suffix) {
        newErrors.incremental = 'Las variables incrementales deben tener al menos un prefijo o sufijo';
      }
      if (incrementalConfig.number_length < 1 || incrementalConfig.number_length > 20) {
        newErrors.number_length = 'La longitud del número debe estar entre 1 y 20';
      }
      if (incrementalConfig.current_number < 0) {
        newErrors.current_number = 'El número actual no puede ser negativo';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const requestData: CreateVariableRequest | UpdateVariableRequest = {
        ...formData,
        incremental_config: formData.variable_type === VariableType.INCREMENTAL ? incrementalConfig : undefined,
        validation_rules: validationRules.length > 0 ? validationRules : undefined
      };

      let result;
      if (isEditMode && variable) {
        result = await SystemVariableFrontendService.updateVariable(variable.id, requestData as UpdateVariableRequest);
      } else {
        result = await SystemVariableFrontendService.createVariable(requestData as CreateVariableRequest);
      }

      if (result.success && result.data) {
        onSave(result.data);
      } else {
        setErrors({ submit: result.error || 'Error al guardar la variable' });
      }
    } catch {
      setErrors({ submit: 'Error inesperado al guardar la variable' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeChange = (type: VariableType) => {
    setFormData(prev => ({ ...prev, variable_type: type }));
    setErrors(prev => ({ ...prev, incremental: '', number_length: '', current_number: '' }));
  };

  const renderDefaultValueInput = () => {
    switch (formData.variable_type) {
      case VariableType.TEXT:
        return (
          <Input
            value={String(formData.default_value || "")}
            onChange={(e) => setFormData(prev => ({ ...prev, default_value: e.target.value }))}
            placeholder="Valor por defecto"
          />
        );
      case VariableType.NUMBER:
        return (
          <Input
            type="number"
            value={String(formData.default_value || "")}
            onChange={(e) => setFormData(prev => ({ ...prev, default_value: parseFloat(e.target.value) || null }))}
            placeholder="Valor numérico por defecto"
          />
        );
      case VariableType.DATE:
        return (
          <Input
            type="date"
            value={String(formData.default_value || "")}
            onChange={(e) => setFormData(prev => ({ ...prev, default_value: e.target.value }))}
          />
        );
      case VariableType.BOOLEAN:
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.default_value === true}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, default_value: checked }))}
            />
            <Label>Valor por defecto: {formData.default_value ? 'Verdadero' : 'Falso'}</Label>
          </div>
        );
      case VariableType.JSON:
        return (
          <Textarea
            value={typeof formData.default_value === 'string' ? formData.default_value : JSON.stringify(formData.default_value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setFormData(prev => ({ ...prev, default_value: parsed }));
              } catch {
                setFormData(prev => ({ ...prev, default_value: e.target.value }));
              }
            }}
            placeholder='{"key": "value"}'
            rows={4}
          />
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Editar Variable' : 'Nueva Variable'}</CardTitle>
          <CardDescription>
            Configure los parámetros básicos de la variable del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="variable_key">Clave de Variable *</Label>
              <Input
                id="variable_key"
                value={formData.variable_key}
                onChange={(e) => handleVariableKeyChange(e.target.value)}
                placeholder="Ej: PURCHASE_ORDER_PREFIX"
                disabled={isEditMode}
                className={errors.variable_key ? 'border-red-500' : ''}
              />
              {errors.variable_key && (
                <p className="text-sm text-red-500">{errors.variable_key}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Nombre de Visualización *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="Ej: Prefijo de Orden de Compra"
                className={errors.display_name ? 'border-red-500' : ''}
              />
              {errors.display_name && (
                <p className="text-sm text-red-500">{errors.display_name}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción detallada de la variable"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="variable_type">Tipo de Variable *</Label>
              <Select value={formData.variable_type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={VariableType.INCREMENTAL}>Incremental</SelectItem>
                  <SelectItem value={VariableType.TEXT}>Texto</SelectItem>
                  <SelectItem value={VariableType.NUMBER}>Número</SelectItem>
                  <SelectItem value={VariableType.DATE}>Fecha</SelectItem>
                  <SelectItem value={VariableType.BOOLEAN}>Booleano</SelectItem>
                  <SelectItem value={VariableType.JSON}>JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as VariableCategory }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={VariableCategory.NUMBERING}>Numeración</SelectItem>
                  <SelectItem value={VariableCategory.LIMITS}>Límites</SelectItem>
                  <SelectItem value={VariableCategory.SETTINGS}>Configuración</SelectItem>
                  <SelectItem value={VariableCategory.DATES}>Fechas</SelectItem>
                  <SelectItem value={VariableCategory.BUSINESS_RULES}>Reglas de Negocio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Nuevo campo de Grupo */}
          {groups.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="group_id">Grupo (Opcional)</Label>
              <Select 
                value={formData.group_id ? formData.group_id.toString() : "0"} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, group_id: value === "0" ? '' : Number(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sin grupo</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_required}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
              />
              <Label>Requerida</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_system}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_system: checked }))}
              />
              <Label>Variable del Sistema</Label>
            </div>
          </div>

          {/* Nuevos campos de configuración avanzada */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuración de Permisos</CardTitle>
              <CardDescription>
                Configure quién puede editar esta variable y en qué nivel opera.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_editable}
                    onCheckedChange={handleEditableChange}
                  />
                  <Label>Editable por Organizaciones</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.system_level_only}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, system_level_only: checked }))}
                  />
                  <Label>Solo Nivel SYSTEM</Label>
                </div>
              </div>

              {formData.is_editable && formData.edit_permission && (
                <div className="space-y-2">
                  <Label>Permiso de Edición (Generado Automáticamente)</Label>
                  <Input
                    value={formData.edit_permission}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Este permiso se creará automáticamente para controlar quién puede editar esta variable.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {formData.variable_type !== VariableType.INCREMENTAL && (
            <div className="space-y-2">
              <Label>Valor por Defecto</Label>
              {renderDefaultValueInput()}
            </div>
          )}
        </CardContent>
      </Card>

      {formData.variable_type === VariableType.INCREMENTAL && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración Incremental</CardTitle>
            <CardDescription>
              Configure el formato y comportamiento de la numeración automática
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prefix">Prefijo</Label>
                <Input
                  id="prefix"
                  value={incrementalConfig.prefix}
                  onChange={(e) => setIncrementalConfig(prev => ({ ...prev, prefix: e.target.value }))}
                  placeholder="Ej: OC-"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="number_length">Longitud del Número *</Label>
                <Input
                  id="number_length"
                  type="number"
                  min="1"
                  max="20"
                  value={incrementalConfig.number_length}
                  onChange={(e) => setIncrementalConfig(prev => ({ ...prev, number_length: parseInt(e.target.value) || 8 }))}
                  className={errors.number_length ? 'border-red-500' : ''}
                />
                {errors.number_length && (
                  <p className="text-sm text-red-500">{errors.number_length}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="suffix">Sufijo</Label>
                <Input
                  id="suffix"
                  value={incrementalConfig.suffix}
                  onChange={(e) => setIncrementalConfig(prev => ({ ...prev, suffix: e.target.value }))}
                  placeholder="Ej: /2024"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_number">Número Actual</Label>
                <Input
                  id="current_number"
                  type="number"
                  min="0"
                  value={incrementalConfig.current_number}
                  onChange={(e) => setIncrementalConfig(prev => ({ ...prev, current_number: parseInt(e.target.value) || 0 }))}
                  className={errors.current_number ? 'border-red-500' : ''}
                />
                {errors.current_number && (
                  <p className="text-sm text-red-500">{errors.current_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset_frequency">Frecuencia de Reinicio</Label>
                <Select 
                  value={incrementalConfig.reset_frequency} 
                  onValueChange={(value) => setIncrementalConfig(prev => ({ ...prev, reset_frequency: value as ResetFrequency }))}
                >
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
            </div>

            {errors.incremental && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.incremental}</AlertDescription>
              </Alert>
            )}

            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Vista previa del formato:</Label>
              <p className="text-lg font-mono mt-1">
                {incrementalConfig.prefix}
                {String(incrementalConfig.current_number + 1).padStart(incrementalConfig.number_length, '0')}
                {incrementalConfig.suffix}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {errors.submit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.submit}</AlertDescription>
        </Alert>
      )}

      <Separator />

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}