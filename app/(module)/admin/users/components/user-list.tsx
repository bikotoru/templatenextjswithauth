'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserType, UserSearchParams } from '../types';
import { UserFrontendService } from '../services/frontend.service';
import { useAuth } from '@/contexts/auth-context';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MoreHorizontal, 
  Search, 
  Edit, 
  Trash2, 
  Shield,
  Key,
  Lock,
  UserPlus,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import AddUserForm from './add-user-form';
import ChangePasswordForm from './change-password-form';

interface UserListProps {
  onUserSelect?: (user: UserType) => void;
  onUserEdit?: (user: UserType) => void;
}

export default function UserList({ onUserSelect, onUserEdit }: UserListProps) {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  
  // Nuevos estados para los modales
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<{ id: number; email: string } | null>(null);

  const pageSize = 10;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: UserSearchParams = {
        search: searchTerm || undefined,
        role: (selectedRole && selectedRole !== 'all_roles') ? selectedRole : undefined,
        page: currentPage,
        pageSize,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      };

      const response = await UserFrontendService.getAll(params);
      setUsers(response.users);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedRole, currentPage, pageSize]);

  const fetchRoles = async () => {
    try {
      const rolesData = await UserFrontendService.getRoles();
      console.log('Roles data received:', rolesData);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleDelete = async (user: UserType) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario ${user.name}?`)) {
      return;
    }

    try {
      await UserFrontendService.delete(user.id);
      toast.success('Usuario eliminado exitosamente');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error al eliminar usuario');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
        {hasPermission('users:create') && (
          <Button onClick={() => setShowAddUserForm(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Agregar Usuario
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_roles">Todos los roles</SelectItem>
            {Array.isArray(roles) && roles.map((role) => (
              <SelectItem key={role.id} value={role.name}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último Login</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  <p className="mt-2 text-sm text-muted-foreground">Cargando usuarios...</p>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No se encontraron usuarios</p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow 
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onUserSelect?.(user)}
                >
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">ID: {user.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.active ? "default" : "secondary"}>
                      {user.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.last_login 
                      ? formatDate(user.last_login)
                      : <span className="text-muted-foreground">Nunca</span>
                    }
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {hasPermission('users:edit') && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onUserEdit?.(user);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {hasPermission('users:manage_roles') && (
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Shield className="mr-2 h-4 w-4" />
                            Gestionar Roles
                          </DropdownMenuItem>
                        )}
                        {hasPermission('users:manage_permissions') && (
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Key className="mr-2 h-4 w-4" />
                            Gestionar Permisos
                          </DropdownMenuItem>
                        )}
                        {hasPermission('users:edit') && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserForPassword({ id: user.id, email: user.email });
                            setShowChangePasswordForm(true);
                          }}>
                            <Lock className="mr-2 h-4 w-4" />
                            Cambiar Contraseña
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {hasPermission('users:delete') && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(user);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modales */}
      <AddUserForm
        open={showAddUserForm}
        onOpenChange={setShowAddUserForm}
        onSuccess={() => {
          fetchUsers();
          setShowAddUserForm(false);
        }}
      />

      {selectedUserForPassword && (
        <ChangePasswordForm
          userId={selectedUserForPassword.id}
          userEmail={selectedUserForPassword.email}
          open={showChangePasswordForm}
          onOpenChange={(open) => {
            setShowChangePasswordForm(open);
            if (!open) {
              setSelectedUserForPassword(null);
            }
          }}
          onSuccess={() => {
            // No necesita refresh ya que la contraseña no afecta la lista
            setShowChangePasswordForm(false);
            setSelectedUserForPassword(null);
          }}
        />
      )}
    </div>
  );
}