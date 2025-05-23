// =============================================
// Tipos TypeScript para Sistema de Variables
// =============================================

export enum VariableType {
  INCREMENTAL = 'incremental',
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  JSON = 'json'
}

export enum VariableCategory {
  NUMBERING = 'numbering',
  LIMITS = 'limits',
  SETTINGS = 'settings',
  DATES = 'dates',
  BUSINESS_RULES = 'business_rules'
}

export enum ValidationType {
  MIN_VALUE = 'min_value',
  MAX_VALUE = 'max_value',
  REGEX = 'regex',
  MIN_LENGTH = 'min_length',
  MAX_LENGTH = 'max_length',
  REQUIRED = 'required'
}

export enum ResetFrequency {
  YEARLY = 'yearly',
  MONTHLY = 'monthly',
  NEVER = 'never'
}

// =============================================
// Interfaces principales
// =============================================

export interface SystemVariableGroup {
  id: number;
  name: string;
  description?: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by_id: number;
  updated_by_id: number;
  
  // Relaciones opcionales
  variables?: SystemVariable[];
  variable_count?: number;
}

export interface SystemVariable {
  id: number;
  organization_id: string;
  variable_key: string;
  display_name: string;
  variable_type: VariableType;
  description?: string;
  category?: VariableCategory;
  
  // Nuevos campos para el sistema mejorado
  group_id?: number;
  is_editable: boolean;
  edit_permission?: string;
  system_level_only: boolean;
  
  // Campos existentes
  is_active: boolean;
  is_required: boolean;
  is_system: boolean;
  default_value?: unknown;
  created_at: string;
  updated_at: string;
  created_by_id: number;
  updated_by_id: number;
  
  // Relaciones opcionales
  group?: SystemVariableGroup;
  incremental_config?: IncrementalConfig;
  current_value?: VariableValue;
  validation_rules?: VariableValidation[];
  
  // Campos de auditoría adicionales
  created_by_name?: string;
  updated_by_name?: string;
}

export interface IncrementalConfig {
  id: number;
  system_variable_id: number;
  prefix: string;
  suffix?: string;
  current_number: number;
  number_length: number;
  reset_frequency?: ResetFrequency;
  last_reset_date?: string;
}

export interface VariableValue {
  id: number;
  system_variable_id: number;
  text_value?: string;
  number_value?: number;
  date_value?: string;
  boolean_value?: boolean;
  updated_at: string;
  updated_by_id: number;
}

export interface VariableValidation {
  id: number;
  system_variable_id: number;
  validation_type: ValidationType;
  validation_value: string;
  error_message?: string;
}

export interface VariableHistory {
  id: number;
  system_variable_id: number;
  generated_number: number;
  generated_code: string;
  used_by_id: number;
  used_at: string;
  context_info?: string;
}

export interface VariableChangeLog {
  id: number;
  system_variable_id: number;
  old_value?: string;
  new_value?: string;
  change_reason?: string;
  changed_by_id: number;
  changed_at: string;
}

// =============================================
// DTOs para requests
// =============================================

export interface CreateGroupRequest {
  name: string;
  description?: string;
  display_order?: number;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  display_order?: number;
  active?: boolean;
}

export interface CreateVariableRequest {
  variable_key: string;
  display_name: string;
  variable_type: VariableType;
  description?: string;
  category?: VariableCategory;
  
  // Nuevos campos
  group_id?: number;
  is_editable?: boolean;
  edit_permission?: string;
  system_level_only?: boolean;
  
  // Campos existentes
  is_required?: boolean;
  is_system?: boolean;
  default_value?: unknown;
  
  // Para variables incrementales
  incremental_config?: {
    prefix: string;
    suffix?: string;
    current_number?: number;
    number_length?: number;
    reset_frequency?: ResetFrequency;
  };
  
  // Para variables con valor inicial
  initial_value?: {
    text_value?: string;
    number_value?: number;
    date_value?: string;
    boolean_value?: boolean;
  };
  
  // Validaciones
  validation_rules?: {
    validation_type: ValidationType;
    validation_value: string;
    error_message?: string;
  }[];
  
  // Para wizard de incrementales
  create_suffix_variable?: boolean;
  suffix_variable_key?: string;
  suffix_variable_name?: string;
}

export interface UpdateVariableRequest {
  variable_key?: string;
  display_name?: string;
  description?: string;
  category?: VariableCategory;
  
  // Nuevos campos
  group_id?: number;
  is_editable?: boolean;
  edit_permission?: string;
  
  // Campos existentes
  is_active?: boolean;
  is_required?: boolean;
  
  // Para variables incrementales
  incremental_config?: {
    prefix?: string;
    suffix?: string;
    number_length?: number;
    current_number?: number;
    reset_frequency?: ResetFrequency;
  };
  
  // Validaciones
  validation_rules?: {
    validation_type: ValidationType;
    validation_value: string;
    error_message?: string;
  }[];
}

export interface SetVariableValueRequest {
  text_value?: string;
  number_value?: number;
  date_value?: string;
  boolean_value?: boolean;
  change_reason?: string;
}

export interface GenerateNumberRequest {
  context_info?: string;
}

// =============================================
// DTOs para responses
// =============================================

export interface GroupListResponse {
  groups: SystemVariableGroup[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface VariableListResponse {
  variables: SystemVariable[];
  groups?: SystemVariableGroup[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface GroupedVariableListResponse {
  groups: (SystemVariableGroup & {
    variables: SystemVariable[];
  })[];
  ungrouped_variables: SystemVariable[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface GenerateNumberResponse {
  success: boolean;
  generated_code?: string;
  number?: number;
  error_message?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
}

export interface WizardCreateResponse {
  success: boolean;
  main_variable?: SystemVariable;
  suffix_variable?: SystemVariable;
  error_message?: string;
}

// =============================================
// Parámetros de búsqueda
// =============================================

export interface GroupSearchParams {
  search?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface VariableSearchParams {
  search?: string;
  category?: VariableCategory;
  variable_type?: VariableType;
  group_id?: number;
  is_active?: boolean;
  is_editable?: boolean;
  system_level_only?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  group_by?: 'group' | 'none';
}

// =============================================
// Configuraciones predefinidas
// =============================================

export interface DefaultVariableConfig {
  key: string;
  name: string;
  type: VariableType;
  category: VariableCategory;
  description?: string;
  is_required?: boolean;
  is_system?: boolean;
  
  // Para incrementales
  incrementalConfig?: {
    prefix: string;
    suffix?: string;
    numberLength?: number;
    resetFrequency?: ResetFrequency;
  };
  
  // Para valores por defecto
  defaultValue?: string | number | boolean | Date | Record<string, unknown>;
  
  // Validaciones
  validations?: {
    type: ValidationType;
    value: string;
    message?: string;
  }[];
}

// =============================================
// Utilidades para tipos
// =============================================

export type VariableValueType = string | number | boolean | Date | Record<string, unknown>;

export interface TypedVariable<T = VariableValueType> extends SystemVariable {
  typed_value?: T;
}

// Tipos específicos para cada tipo de variable
export type IncrementalVariable = TypedVariable<never>; // No tiene valor, solo genera números
export type TextVariable = TypedVariable<string>;
export type NumberVariable = TypedVariable<number>;
export type DateVariable = TypedVariable<Date>;
export type BooleanVariable = TypedVariable<boolean>;
export type JsonVariable<T = Record<string, unknown>> = TypedVariable<T>;

// =============================================
// Constantes
// =============================================

export const VARIABLE_TYPE_LABELS: Record<VariableType, string> = {
  [VariableType.INCREMENTAL]: 'Incremental',
  [VariableType.TEXT]: 'Texto',
  [VariableType.NUMBER]: 'Número',
  [VariableType.DATE]: 'Fecha',
  [VariableType.BOOLEAN]: 'Verdadero/Falso',
  [VariableType.JSON]: 'JSON'
};

export const VARIABLE_CATEGORY_LABELS: Record<VariableCategory, string> = {
  [VariableCategory.NUMBERING]: 'Numeración',
  [VariableCategory.LIMITS]: 'Límites',
  [VariableCategory.SETTINGS]: 'Configuración',
  [VariableCategory.DATES]: 'Fechas',
  [VariableCategory.BUSINESS_RULES]: 'Reglas de Negocio'
};

export const VALIDATION_TYPE_LABELS: Record<ValidationType, string> = {
  [ValidationType.MIN_VALUE]: 'Valor Mínimo',
  [ValidationType.MAX_VALUE]: 'Valor Máximo',
  [ValidationType.REGEX]: 'Expresión Regular',
  [ValidationType.MIN_LENGTH]: 'Longitud Mínima',
  [ValidationType.MAX_LENGTH]: 'Longitud Máxima',
  [ValidationType.REQUIRED]: 'Requerido'
};

export const RESET_FREQUENCY_LABELS: Record<ResetFrequency, string> = {
  [ResetFrequency.YEARLY]: 'Anual',
  [ResetFrequency.MONTHLY]: 'Mensual',
  [ResetFrequency.NEVER]: 'Nunca'
};