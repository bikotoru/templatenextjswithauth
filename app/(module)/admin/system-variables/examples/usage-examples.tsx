'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  useIncrementalVariable, 
  useTextVariable, 
  useNumberVariable, 
  useBooleanVariable,
  useSystemVariables 
} from '@/hooks/use-system-variables';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, FileText, Calculator, ToggleLeft, Hash } from 'lucide-react';

export function SystemVariableUsageExamples() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Ejemplos de Uso - Variables del Sistema</h2>
        <p className="text-muted-foreground">
          Demostraciones prácticas de cómo usar las variables del sistema en su aplicación.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncrementalVariableExample />
        <TextVariableExample />
        <NumberVariableExample />
        <BooleanVariableExample />
      </div>

      <MultipleVariablesExample />
      <CodeExamples />
    </div>
  );
}

function IncrementalVariableExample() {
  const { variable, loading, error, generateNext, getNextNumber } = useIncrementalVariable('PURCHASE_ORDER_NUMBER');
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const result = await generateNext('Ejemplo desde interfaz de demostración');
      setLastGenerated(result.number ? String(result.number) : null);
    } catch (err) {
      console.error('Error al generar número:', err);
    } finally {
      setGenerating(false);
    }
  };

  const nextNumber = getNextNumber();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Variable Incremental
        </CardTitle>
        <CardDescription>
          Ejemplo de numeración automática para órdenes de compra
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando variable...
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : variable ? (
          <>
            <div className="space-y-2">
              <Label>Variable: {variable.display_name}</Label>
              <Badge variant="outline">{variable.variable_key}</Badge>
            </div>

            <div className="space-y-2">
              <Label>Número Actual</Label>
              <div className="text-2xl font-mono font-bold">
                {variable.incremental_config?.current_number || 0}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Próximo Número</Label>
              <div className="text-lg font-mono text-blue-600">
                {nextNumber || 'No configurado'}
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={generating}
              className="w-full"
            >
              {generating ? 'Generando...' : 'Generar Siguiente Número'}
            </Button>

            {lastGenerated && (
              <Alert>
                <AlertDescription>
                  <strong>Último número generado:</strong> {lastGenerated}
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <Alert>
            <AlertDescription>
              Variable no encontrada. Asegúrese de crear una variable incremental con clave &apos;PURCHASE_ORDER_NUMBER&apos;.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function TextVariableExample() {
  const { variable, value, loading, error, updateValue } = useTextVariable('COMPANY_SLOGAN');
  const [newValue, setNewValue] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!newValue.trim()) return;
    
    try {
      setUpdating(true);
      await updateValue(newValue, 'Actualizado desde ejemplo de interfaz');
      setNewValue('');
    } catch (err) {
      console.error('Error al actualizar:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Variable de Texto
        </CardTitle>
        <CardDescription>
          Ejemplo de configuración de texto del sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando variable...
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : variable ? (
          <>
            <div className="space-y-2">
              <Label>Variable: {variable.display_name}</Label>
              <Badge variant="outline">{variable.variable_key}</Badge>
            </div>

            <div className="space-y-2">
              <Label>Valor Actual</Label>
              <div className="p-3 bg-muted rounded-md">
                {value || 'Sin valor configurado'}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newTextValue">Nuevo Valor</Label>
              <Input
                id="newTextValue"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Ingrese un nuevo valor"
              />
            </div>

            <Button 
              onClick={handleUpdate} 
              disabled={updating || !newValue.trim()}
              className="w-full"
            >
              {updating ? 'Actualizando...' : 'Actualizar Valor'}
            </Button>
          </>
        ) : (
          <Alert>
            <AlertDescription>
              Variable no encontrada. Cree una variable de texto con clave &apos;COMPANY_SLOGAN&apos;.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function NumberVariableExample() {
  const { variable, value, loading, error, updateValue } = useNumberVariable('MAX_PURCHASE_AMOUNT');
  const [newValue, setNewValue] = useState<number>(0);
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      await updateValue(newValue, 'Actualizado desde ejemplo de interfaz');
    } catch (err) {
      console.error('Error al actualizar:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Variable Numérica
        </CardTitle>
        <CardDescription>
          Ejemplo de límite numérico del sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando variable...
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : variable ? (
          <>
            <div className="space-y-2">
              <Label>Variable: {variable.display_name}</Label>
              <Badge variant="outline">{variable.variable_key}</Badge>
            </div>

            <div className="space-y-2">
              <Label>Valor Actual</Label>
              <div className="text-2xl font-mono font-bold">
                ${value?.toLocaleString() || '0'}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newNumberValue">Nuevo Valor</Label>
              <Input
                id="newNumberValue"
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(parseFloat(e.target.value) || 0)}
                placeholder="Ingrese un nuevo límite"
              />
            </div>

            <Button 
              onClick={handleUpdate} 
              disabled={updating}
              className="w-full"
            >
              {updating ? 'Actualizando...' : 'Actualizar Límite'}
            </Button>
          </>
        ) : (
          <Alert>
            <AlertDescription>
              Variable no encontrada. Cree una variable numérica con clave &apos;MAX_PURCHASE_AMOUNT&apos;.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function BooleanVariableExample() {
  const { variable, value, loading, error, toggle } = useBooleanVariable('MAINTENANCE_MODE');
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    try {
      setToggling(true);
      await toggle('Cambiado desde ejemplo de interfaz');
    } catch (err) {
      console.error('Error al cambiar:', err);
    } finally {
      setToggling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ToggleLeft className="w-5 h-5" />
          Variable Booleana
        </CardTitle>
        <CardDescription>
          Ejemplo de configuración de modo mantenimiento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando variable...
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : variable ? (
          <>
            <div className="space-y-2">
              <Label>Variable: {variable.display_name}</Label>
              <Badge variant="outline">{variable.variable_key}</Badge>
            </div>

            <div className="space-y-2">
              <Label>Estado Actual</Label>
              <div className="flex items-center gap-2">
                <Badge variant={value ? 'destructive' : 'secondary'}>
                  {value ? 'ACTIVO' : 'INACTIVO'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={value || false}
                onCheckedChange={handleToggle}
                disabled={toggling}
              />
              <Label>Modo Mantenimiento</Label>
            </div>

            <Button 
              onClick={handleToggle} 
              disabled={toggling}
              variant="outline"
              className="w-full"
            >
              {toggling ? 'Cambiando...' : value ? 'Desactivar' : 'Activar'}
            </Button>
          </>
        ) : (
          <Alert>
            <AlertDescription>
              Variable no encontrada. Cree una variable booleana con clave &apos;MAINTENANCE_MODE&apos;.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function MultipleVariablesExample() {
  const { variables, loading, error } = useSystemVariables([
    'PURCHASE_ORDER_NUMBER',
    'COMPANY_SLOGAN',
    'MAX_PURCHASE_AMOUNT',
    'MAINTENANCE_MODE'
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Múltiples Variables</CardTitle>
        <CardDescription>
          Ejemplo de carga y manejo de múltiples variables del sistema simultáneamente
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando variables...
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {Object.entries(variables).map(([key, variable]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div>
                  <div className="font-medium">{variable.display_name}</div>
                  <Badge variant="outline" className="text-xs">{variable.variable_key}</Badge>
                </div>
                <Badge variant="secondary">{variable.variable_type}</Badge>
              </div>
            ))}
            {Object.keys(variables).length === 0 && (
              <Alert>
                <AlertDescription>
                  No se encontraron variables. Asegúrese de crear las variables de ejemplo.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CodeExamples() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ejemplos de Código</CardTitle>
        <CardDescription>
          Fragmentos de código que muestran cómo usar las variables del sistema en sus componentes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">1. Variable Incremental (Numeración Automática)</h4>
          <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
{`import { useIncrementalVariable } from '@/hooks/use-system-variables';

function PurchaseOrderForm() {
  const { generateNext, getNextNumber } = useIncrementalVariable('PURCHASE_ORDER_NUMBER');
  
  const handleSubmit = async () => {
    const result = await generateNext('Nueva orden de compra');
    console.log('Número generado:', result.number);
  };
  
  return (
    <div>
      <p>Próximo número: {getNextNumber()}</p>
      <button onClick={handleSubmit}>Crear Orden</button>
    </div>
  );
}`}
          </pre>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-2">2. Variable de Configuración</h4>
          <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
{`import { useNumberVariable, useBooleanVariable } from '@/hooks/use-system-variables';

function PurchaseValidation({ amount }: { amount: number }) {
  const { value: maxAmount } = useNumberVariable('MAX_PURCHASE_AMOUNT');
  const { value: maintenanceMode } = useBooleanVariable('MAINTENANCE_MODE');
  
  if (maintenanceMode) {
    return <div>Sistema en mantenimiento</div>;
  }
  
  if (maxAmount && amount > maxAmount) {
    return <div>Monto excede el límite de \${maxAmount}</div>;
  }
  
  return <div>Validación exitosa</div>;
}`}
          </pre>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-2">3. Múltiples Variables</h4>
          <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
{`import { useSystemVariables } from '@/hooks/use-system-variables';

function Dashboard() {
  const { variables, loading } = useSystemVariables([
    'COMPANY_SLOGAN',
    'MAX_PURCHASE_AMOUNT',
    'MAINTENANCE_MODE'
  ]);
  
  if (loading) return <div>Cargando configuración...</div>;
  
  return (
    <div>
      <h1>{variables.COMPANY_SLOGAN?.current_value?.text_value}</h1>
      <p>Límite de compra: \${variables.MAX_PURCHASE_AMOUNT?.current_value?.number_value}</p>
      {variables.MAINTENANCE_MODE?.current_value?.boolean_value && (
        <div className="alert">Sistema en mantenimiento</div>
      )}
    </div>
  );
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}