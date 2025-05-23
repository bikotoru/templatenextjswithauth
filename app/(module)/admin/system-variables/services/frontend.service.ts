import {
  SystemVariable,
  CreateVariableRequest,
  UpdateVariableRequest,
  SetVariableValueRequest,
  GenerateNumberResponse,
  VariableSearchParams,
  VariableListResponse,
  ValidationResult,
  VariableType
} from '../types';

export class SystemVariableFrontendService {
  
  // =============================================
  // Métodos CRUD principales
  // =============================================
  
  static async getAll(params: VariableSearchParams = {}): Promise<VariableListResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const response = await fetch(`/api/admin/system-variables?${searchParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Error al cargar variables del sistema');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error al cargar variables');
    }

    return result.data;
  }

  static async getById(id: number): Promise<SystemVariable> {
    const response = await fetch(`/api/admin/system-variables/${id}`);
    
    if (!response.ok) {
      throw new Error('Error al cargar variable');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Variable no encontrada');
    }

    return result.data;
  }

  static async getByKey(key: string): Promise<SystemVariable> {
    const response = await fetch(`/api/admin/system-variables/key/${key}`);
    
    if (!response.ok) {
      throw new Error('Error al cargar variable');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Variable no encontrada');
    }

    return result.data;
  }

  static async createVariable(data: CreateVariableRequest): Promise<{ success: boolean; data?: SystemVariable; error?: string }> {
    const response = await fetch('/api/admin/system-variables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Error al crear variable'
      };
    }

    return result;
  }

  static async updateVariable(id: number, data: UpdateVariableRequest): Promise<{ success: boolean; data?: SystemVariable; error?: string }> {
    const response = await fetch(`/api/admin/system-variables/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Error al actualizar variable'
      };
    }

    return result;
  }

  static async delete(id: number): Promise<void> {
    const response = await fetch(`/api/admin/system-variables/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Error al eliminar variable');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error al eliminar variable');
    }
  }

  // =============================================
  // Métodos para valores
  // =============================================

  static async setValue(id: number, data: SetVariableValueRequest): Promise<void> {
    const response = await fetch(`/api/admin/system-variables/${id}/value`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Error al establecer valor');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error al establecer valor');
    }
  }

  // =============================================
  // Métodos para variables incrementales
  // =============================================

  static async generateNumber(key: string, context?: string): Promise<GenerateNumberResponse> {
    const response = await fetch('/api/admin/system-variables/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variable_key: key,
        context_info: context
      }),
    });

    if (!response.ok) {
      throw new Error('Error al generar número');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error al generar número');
    }

    return result.data;
  }

  static async resetCounter(id: number): Promise<void> {
    const response = await fetch(`/api/admin/system-variables/${id}/reset`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Error al reiniciar contador');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error al reiniciar contador');
    }
  }

  // =============================================
  // Métodos de validación
  // =============================================

  static async validateValue(key: string, value: unknown): Promise<ValidationResult> {
    const response = await fetch('/api/admin/system-variables/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variable_key: key,
        value
      }),
    });

    if (!response.ok) {
      throw new Error('Error al validar valor');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error al validar valor');
    }

    return result.data;
  }

  // =============================================
  // Métodos de utilidad
  // =============================================

  static async getCategories(): Promise<string[]> {
    const response = await fetch('/api/admin/system-variables/categories');
    
    if (!response.ok) {
      throw new Error('Error al cargar categorías');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error al cargar categorías');
    }

    return result.data;
  }

  static async getHistory(id: number): Promise<unknown[]> {
    const response = await fetch(`/api/admin/system-variables/${id}/history`);
    
    if (!response.ok) {
      throw new Error('Error al cargar historial');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error al cargar historial');
    }

    return result.data;
  }

  // =============================================
  // Métodos tipados por tipo de variable
  // =============================================

  static async getTextValue(key: string): Promise<string | null> {
    const variable = await this.getByKey(key);
    
    if (variable.variable_type !== VariableType.TEXT) {
      throw new Error('La variable no es de tipo texto');
    }

    return variable.current_value?.text_value || null;
  }

  static async getNumberValue(key: string): Promise<number | null> {
    const variable = await this.getByKey(key);
    
    if (variable.variable_type !== VariableType.NUMBER) {
      throw new Error('La variable no es de tipo número');
    }

    return variable.current_value?.number_value || null;
  }

  static async getDateValue(key: string): Promise<Date | null> {
    const variable = await this.getByKey(key);
    
    if (variable.variable_type !== VariableType.DATE) {
      throw new Error('La variable no es de tipo fecha');
    }

    const dateStr = variable.current_value?.date_value;
    return dateStr ? new Date(dateStr) : null;
  }

  static async getBooleanValue(key: string): Promise<boolean | null> {
    const variable = await this.getByKey(key);
    
    if (variable.variable_type !== VariableType.BOOLEAN) {
      throw new Error('La variable no es de tipo booleano');
    }

    return variable.current_value?.boolean_value ?? null;
  }

  static async getJsonValue<T = Record<string, unknown>>(key: string): Promise<T | null> {
    const variable = await this.getByKey(key);
    
    if (variable.variable_type !== VariableType.JSON) {
      throw new Error('La variable no es de tipo JSON');
    }

    const jsonStr = variable.current_value?.text_value;
    return jsonStr ? JSON.parse(jsonStr) : null;
  }

  static async setTextValue(key: string, value: string, reason?: string): Promise<void> {
    const variable = await this.getByKey(key);
    
    if (variable.variable_type !== VariableType.TEXT) {
      throw new Error('La variable no es de tipo texto');
    }

    await this.setValue(variable.id, {
      text_value: value,
      change_reason: reason
    });
  }

  static async setNumberValue(key: string, value: number, reason?: string): Promise<void> {
    const variable = await this.getByKey(key);
    
    if (variable.variable_type !== VariableType.NUMBER) {
      throw new Error('La variable no es de tipo número');
    }

    await this.setValue(variable.id, {
      number_value: value,
      change_reason: reason
    });
  }

  static async setDateValue(key: string, value: Date | string, reason?: string): Promise<void> {
    const variable = await this.getByKey(key);
    
    if (variable.variable_type !== VariableType.DATE) {
      throw new Error('La variable no es de tipo fecha');
    }

    const dateValue = value instanceof Date ? value.toISOString() : value;

    await this.setValue(variable.id, {
      date_value: dateValue,
      change_reason: reason
    });
  }

  static async setBooleanValue(key: string, value: boolean, reason?: string): Promise<void> {
    const variable = await this.getByKey(key);
    
    if (variable.variable_type !== VariableType.BOOLEAN) {
      throw new Error('La variable no es de tipo booleano');
    }

    await this.setValue(variable.id, {
      boolean_value: value,
      change_reason: reason
    });
  }

  static async setJsonValue<T = Record<string, unknown>>(key: string, value: T, reason?: string): Promise<void> {
    const variable = await this.getByKey(key);
    
    if (variable.variable_type !== VariableType.JSON) {
      throw new Error('La variable no es de tipo JSON');
    }

    await this.setValue(variable.id, {
      text_value: JSON.stringify(value),
      change_reason: reason
    });
  }
}