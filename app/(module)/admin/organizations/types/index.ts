export interface OrganizationType {
  id: string; // UNIQUEIDENTIFIER
  name: string;
  logo?: string;
  rut?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by_id: number;
  updated_by_id: number;
  userCount?: number; // Cantidad de usuarios en la organización
}

export interface OrganizationCreateRequest {
  name: string;
  logo?: string;
  rut?: string;
  active?: boolean;
}

export interface OrganizationUpdateRequest {
  name?: string;
  logo?: string;
  rut?: string;
  active?: boolean;
}

export interface OrganizationSearchParams {
  search?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface OrganizationListResponse {
  organizations: OrganizationType[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface OrganizationStatsResponse {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  averageUsersPerOrg: number;
}