import { UserType, UserCreateRequest, UserUpdateRequest, UserSearchParams, UserListResponse } from '../types';

export class UserFrontendService {
  private static baseUrl = '/api/admin/users';

  static async getAll(params: UserSearchParams = {}): Promise<UserListResponse> {
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
      throw new Error(data.error || 'Error al obtener usuarios');
    }
    
    return data.data;
  }

  static async getById(id: number): Promise<UserType> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al obtener usuario');
    }
    
    return data.data;
  }

  static async create(userData: UserCreateRequest): Promise<UserType> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al crear usuario');
    }
    
    return data.data;
  }

  static async update(id: number, userData: UserUpdateRequest): Promise<UserType> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al actualizar usuario');
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
      throw new Error(data.error || 'Error al eliminar usuario');
    }
    
    return true;
  }

  static async assignRoles(userId: number, roleIds: number[]): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/${userId}/roles`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roleIds }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al asignar roles');
    }
    
    return true;
  }

  static async assignPermissions(userId: number, permissionIds: number[]): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/${userId}/permissions`, {
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

  static async getRoles(): Promise<{ id: number; name: string; description?: string }[]> {
    const response = await fetch('/api/admin/roles/simple');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al obtener roles');
    }
    
    return data.data;
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

  static async canChangePassword(userId: number): Promise<{ canChangePassword: boolean; reason?: string }> {
    const response = await fetch(`/api/admin/users/${userId}/can-change-password`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al verificar permisos de contraseña');
    }
    
    return {
      canChangePassword: data.data.canChangePassword,
      reason: data.data.reason
    };
  }

  static async changePassword(userId: number, newPassword: string): Promise<boolean> {
    const response = await fetch(`/api/admin/users/${userId}/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newPassword }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al cambiar contraseña');
    }
    
    return true;
  }

  static async addUser(userData: {
    email: string;
    name?: string;
    roleIds?: number[];
    permissionIds?: number[];
    temporaryPassword?: string;
  }): Promise<{ userId: number; isNewUser: boolean; temporaryPassword?: string }> {
    const response = await fetch('/admin/users/api/add-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al agregar usuario');
    }
    
    return data.data;
  }
}