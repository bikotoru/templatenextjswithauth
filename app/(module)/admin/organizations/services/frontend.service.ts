import { 
  OrganizationType, 
  OrganizationCreateRequest, 
  OrganizationUpdateRequest, 
  OrganizationSearchParams, 
  OrganizationListResponse,
  OrganizationStatsResponse 
} from '../types';

export class OrganizationFrontendService {
  private static baseUrl = '/api/admin/organizations';

  static async getAll(params: OrganizationSearchParams = {}): Promise<OrganizationListResponse> {
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
      throw new Error(data.error || 'Error al obtener organizaciones');
    }
    
    return data.data;
  }

  static async getById(id: string): Promise<OrganizationType> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al obtener organización');
    }
    
    return data.data;
  }

  static async create(organizationData: OrganizationCreateRequest): Promise<OrganizationType> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(organizationData),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return data.data;
  }

  static async update(id: string, organizationData: OrganizationUpdateRequest): Promise<OrganizationType> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(organizationData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al actualizar organización');
    }
    
    return data.data;
  }

  static async delete(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al eliminar organización');
    }
    
    return true;
  }

  static async getStats(): Promise<OrganizationStatsResponse> {
    const response = await fetch(`/api/admin/organizations/stats`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al obtener estadísticas');
    }
    
    return data.data;
  }
}