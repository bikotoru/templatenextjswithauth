'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  SystemVariable, 
  VariableType, 
  GenerateNumberResponse,
  SetVariableValueRequest 
} from '@/app/(module)/admin/system-variables/types';
import { SystemVariableFrontendService } from '@/app/(module)/admin/system-variables/services/frontend.service';

interface UseSystemVariableOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useSystemVariable(key: string, options?: UseSystemVariableOptions) {
  const [variable, setVariable] = useState<SystemVariable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVariable = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await SystemVariableFrontendService.getByKey(key);
      setVariable(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar variable');
      setVariable(null);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    loadVariable();

    if (options?.autoRefresh && options.refreshInterval) {
      const interval = setInterval(loadVariable, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadVariable, options?.autoRefresh, options?.refreshInterval]);

  const setValue = useCallback(async (data: SetVariableValueRequest) => {
    if (!variable) throw new Error('Variable no cargada');
    
    await SystemVariableFrontendService.setValue(variable.id, data);
    await loadVariable(); // Recargar después de actualizar
  }, [variable, loadVariable]);

  const refresh = useCallback(() => {
    loadVariable();
  }, [loadVariable]);

  return {
    variable,
    loading,
    error,
    setValue,
    refresh
  };
}

export function useIncrementalVariable(key: string) {
  const { variable, loading, error, refresh } = useSystemVariable(key);

  const generateNext = useCallback(async (context?: string): Promise<GenerateNumberResponse> => {
    if (!variable) {
      throw new Error('Variable no cargada');
    }

    if (variable.variable_type !== VariableType.INCREMENTAL) {
      throw new Error('La variable no es de tipo incremental');
    }

    const result = await SystemVariableFrontendService.generateNumber(key, context);
    await refresh(); // Actualizar el estado después de generar
    return result;
  }, [variable, key, refresh]);

  const resetCounter = useCallback(async () => {
    if (!variable) {
      throw new Error('Variable no cargada');
    }

    await SystemVariableFrontendService.resetCounter(variable.id);
    await refresh();
  }, [variable, refresh]);

  const getNextNumber = useCallback((): string | null => {
    if (!variable?.incremental_config) return null;

    const config = variable.incremental_config;
    const nextNumber = config.current_number + 1;
    
    return config.prefix + 
           String(nextNumber).padStart(config.number_length, '0') + 
           (config.suffix || '');
  }, [variable]);

  return {
    variable,
    loading,
    error,
    generateNext,
    resetCounter,
    getNextNumber,
    refresh
  };
}

export function useTextVariable(key: string) {
  const { variable, loading, error, setValue, refresh } = useSystemVariable(key);

  const value = variable?.current_value?.text_value || null;

  const updateValue = useCallback(async (newValue: string, reason?: string) => {
    if (!variable) {
      throw new Error('Variable no cargada');
    }

    if (variable.variable_type !== VariableType.TEXT) {
      throw new Error('La variable no es de tipo texto');
    }

    await setValue({
      text_value: newValue,
      change_reason: reason
    });
  }, [variable, setValue]);

  return {
    variable,
    value,
    loading,
    error,
    updateValue,
    refresh
  };
}

export function useNumberVariable(key: string) {
  const { variable, loading, error, setValue, refresh } = useSystemVariable(key);

  const value = variable?.current_value?.number_value || null;

  const updateValue = useCallback(async (newValue: number, reason?: string) => {
    if (!variable) {
      throw new Error('Variable no cargada');
    }

    if (variable.variable_type !== VariableType.NUMBER) {
      throw new Error('La variable no es de tipo número');
    }

    await setValue({
      number_value: newValue,
      change_reason: reason
    });
  }, [variable, setValue]);

  return {
    variable,
    value,
    loading,
    error,
    updateValue,
    refresh
  };
}

export function useBooleanVariable(key: string) {
  const { variable, loading, error, setValue, refresh } = useSystemVariable(key);

  const value = variable?.current_value?.boolean_value ?? null;

  const updateValue = useCallback(async (newValue: boolean, reason?: string) => {
    if (!variable) {
      throw new Error('Variable no cargada');
    }

    if (variable.variable_type !== VariableType.BOOLEAN) {
      throw new Error('La variable no es de tipo booleano');
    }

    await setValue({
      boolean_value: newValue,
      change_reason: reason
    });
  }, [variable, setValue]);

  const toggle = useCallback(async (reason?: string) => {
    const currentValue = value ?? false;
    await updateValue(!currentValue, reason);
  }, [value, updateValue]);

  return {
    variable,
    value,
    loading,
    error,
    updateValue,
    toggle,
    refresh
  };
}

export function useDateVariable(key: string) {
  const { variable, loading, error, setValue, refresh } = useSystemVariable(key);

  const value = variable?.current_value?.date_value ? new Date(variable.current_value.date_value) : null;

  const updateValue = useCallback(async (newValue: Date | string, reason?: string) => {
    if (!variable) {
      throw new Error('Variable no cargada');
    }

    if (variable.variable_type !== VariableType.DATE) {
      throw new Error('La variable no es de tipo fecha');
    }

    const dateValue = newValue instanceof Date ? newValue.toISOString() : newValue;

    await setValue({
      date_value: dateValue,
      change_reason: reason
    });
  }, [variable, setValue]);

  return {
    variable,
    value,
    loading,
    error,
    updateValue,
    refresh
  };
}

export function useJsonVariable<T = Record<string, unknown>>(key: string) {
  const { variable, loading, error, setValue, refresh } = useSystemVariable(key);

  const value: T | null = variable?.current_value?.text_value 
    ? JSON.parse(variable.current_value.text_value) 
    : null;

  const updateValue = useCallback(async (newValue: T, reason?: string) => {
    if (!variable) {
      throw new Error('Variable no cargada');
    }

    if (variable.variable_type !== VariableType.JSON) {
      throw new Error('La variable no es de tipo JSON');
    }

    await setValue({
      text_value: JSON.stringify(newValue),
      change_reason: reason
    });
  }, [variable, setValue]);

  return {
    variable,
    value,
    loading,
    error,
    updateValue,
    refresh
  };
}

// Hook para múltiples variables del sistema
export function useSystemVariables(keys: string[]) {
  const [variables, setVariables] = useState<Record<string, SystemVariable>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVariables = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const promises = keys.map(async (key) => {
        try {
          const variable = await SystemVariableFrontendService.getByKey(key);
          return { key, variable };
        } catch {
          return { key, variable: null };
        }
      });

      const results = await Promise.all(promises);
      const variableMap: Record<string, SystemVariable> = {};
      
      results.forEach(({ key, variable }) => {
        if (variable) {
          variableMap[key] = variable;
        }
      });

      setVariables(variableMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar variables');
    } finally {
      setLoading(false);
    }
  }, [keys]);

  useEffect(() => {
    if (keys.length > 0) {
      loadVariables();
    }
  }, [loadVariables, keys]);

  const refresh = useCallback(() => {
    loadVariables();
  }, [loadVariables]);

  return {
    variables,
    loading,
    error,
    refresh
  };
}

// Hook de utilidad para validar valores
export function useVariableValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validateValue = useCallback(async (key: string, value: unknown) => {
    setIsValidating(true);
    try {
      const result = await SystemVariableFrontendService.validateValue(key, value);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, []);

  return {
    validateValue,
    isValidating
  };
}