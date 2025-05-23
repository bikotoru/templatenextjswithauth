export interface RoleType {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  permissions: string[];
  userCount?: number;
  permission_ids?: number[];
  user_details?: { id: number; name: string; email: string; active: boolean }[];
}

export interface RoleCreateRequest {
  name: string;
  description?: string;
  active?: boolean;
  permissionIds?: number[];
  userIds?: number[];
}

export interface RoleUpdateRequest {
  name?: string;
  description?: string;
  active?: boolean;
  permissionIds?: number[];
  userIds?: number[];
}

export interface RolePermissionAssignRequest {
  roleId: number;
  permissionIds: number[];
}

export interface RoleListResponse {
  roles: RoleType[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface RoleSearchParams {
  search?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PermissionType {
  id: number;
  permission_key: string;
  display_name: string;
  description?: string;
  module: string;
  active: boolean;
}