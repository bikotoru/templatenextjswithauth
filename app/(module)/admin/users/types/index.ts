export interface UserType {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
  roles: string[];
  permissions: string[];
}

export interface UserCreateRequest {
  email: string;
  password: string;
  name: string;
  avatar?: string;
  active?: boolean;
  roleIds?: number[];
  permissionIds?: number[];
}

export interface UserUpdateRequest {
  email?: string;
  password?: string;
  name?: string;
  avatar?: string;
  active?: boolean;
}

export interface UserRoleAssignRequest {
  userId: number;
  roleIds: number[];
}

export interface UserPermissionAssignRequest {
  userId: number;
  permissionIds: number[];
}

export interface UserListResponse {
  users: UserType[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface UserSearchParams {
  search?: string;
  role?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface RoleType {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PermissionType {
  id: number;
  permission_key: string;
  display_name: string;
  description?: string;
  module: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}