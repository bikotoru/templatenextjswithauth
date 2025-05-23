import {
  SystemVariableGroup,
  CreateGroupRequest,
  UpdateGroupRequest,
  GroupSearchParams,
  GroupListResponse
} from '../types';

export class SystemVariableGroupsFrontendService {
  private static baseUrl = '/api/admin/system-variables/groups';

  // =============================================
  // Métodos CRUD principales
  // =============================================

  static async getAll(params: GroupSearchParams = {}): Promise<GroupListResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params.search) searchParams.append('search', params.search);
      if (params.active !== undefined) searchParams.append('active', params.active.toString());
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
      if (params.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

      const url = `${this.baseUrl}?${searchParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error de red' }));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al obtener grupos');
      }

      return data.data;
    } catch (error) {
      console.error('Error in SystemVariableGroupsFrontendService.getAll:', error);
      throw error;
    }
  }

  static async getById(id: number): Promise<SystemVariableGroup> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error de red' }));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al obtener grupo');
      }

      return data.data;
    } catch (error) {
      console.error('Error in SystemVariableGroupsFrontendService.getById:', error);
      throw error;
    }
  }

  static async create(groupData: CreateGroupRequest): Promise<SystemVariableGroup> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error de red' }));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al crear grupo');
      }

      return data.data;
    } catch (error) {
      console.error('Error in SystemVariableGroupsFrontendService.create:', error);
      throw error;
    }
  }

  static async update(id: number, groupData: UpdateGroupRequest): Promise<SystemVariableGroup> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error de red' }));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al actualizar grupo');
      }

      return data.data;
    } catch (error) {
      console.error('Error in SystemVariableGroupsFrontendService.update:', error);
      throw error;
    }
  }

  static async delete(id: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error de red' }));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al eliminar grupo');
      }
    } catch (error) {
      console.error('Error in SystemVariableGroupsFrontendService.delete:', error);
      throw error;
    }
  }

  // =============================================
  // Métodos auxiliares
  // =============================================

  static async getGroupOptions(): Promise<Pick<SystemVariableGroup, 'id' | 'name' | 'display_order'>[]> {
    try {
      const response = await fetch(`${this.baseUrl}/options`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error de red' }));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al obtener opciones de grupos');
      }

      return data.data;
    } catch (error) {
      console.error('Error in SystemVariableGroupsFrontendService.getGroupOptions:', error);
      throw error;
    }
  }

  // =============================================
  // Métodos de validación
  // =============================================

  static validateGroupData(data: CreateGroupRequest | UpdateGroupRequest): string[] {
    const errors: string[] = [];

    if ('name' in data && data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push('El nombre del grupo es requerido');
      } else if (data.name.length > 100) {
        errors.push('El nombre del grupo no puede exceder 100 caracteres');
      }
    }

    if (data.description && data.description.length > 500) {
      errors.push('La descripción no puede exceder 500 caracteres');
    }

    if (data.display_order !== undefined && (data.display_order < 0 || data.display_order > 999)) {
      errors.push('El orden de visualización debe estar entre 0 y 999');
    }

    return errors;
  }

  // =============================================
  // Métodos de utilidad
  // =============================================

  static formatGroupName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  static generateGroupKey(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }
}