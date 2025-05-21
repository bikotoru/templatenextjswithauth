import { RoleType, RoleCreateRequest, RoleUpdateRequest, RoleSearchParams, RoleListResponse } from '../types';

export class RoleFrontendService {
  private static baseUrl = '/api/admin/roles';

  static async getAll(params: RoleSearchParams = {}): Promise<RoleListResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}?${searchParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al obtener roles');
    }
    
    return data.data;
  }

  static async getById(id: number): Promise<RoleType> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al obtener rol');
    }
    
    return data.data;
  }

  static async create(roleData: RoleCreateRequest): Promise<RoleType> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roleData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al crear rol');
    }
    
    return data.data;
  }

  static async update(id: number, roleData: RoleUpdateRequest): Promise<RoleType> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roleData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al actualizar rol');
    }
    
    return data.data;
  }

  static async delete(id: number): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al eliminar rol');
    }
    
    return true;
  }

  static async assignPermissions(roleId: number, permissionIds: number[]): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/${roleId}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ permissionIds }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al asignar permisos');
    }
    
    return true;
  }

  static async getPermissions(): Promise<{ id: number; permission_key: string; display_name: string; module: string }[]> {
    const response = await fetch('/api/admin/permissions');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al obtener permisos');
    }
    
    return data.data;
  }

  static async getRolePermissions(roleId: number): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/${roleId}/permissions`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al obtener permisos del rol');
    }
    
    return data.data;
  }
}