'use client';

import { useState, useEffect } from 'react';
import { RoleType, RoleSearchParams } from '../types';
import { RoleFrontendService } from '../services/frontend.service';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Key,
  Loader2,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

interface RoleListProps {
  onRoleSelect?: (role: RoleType) => void;
  onRoleEdit?: (role: RoleType) => void;
  onRoleCreate?: () => void;
  onManagePermissions?: (role: RoleType) => void;
}

export default function RoleList({ 
  onRoleSelect, 
  onRoleEdit, 
  onRoleCreate, 
  onManagePermissions 
}: RoleListProps) {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const pageSize = 10;

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const params: RoleSearchParams = {
        search: searchTerm || undefined,
        page: currentPage,
        pageSize,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      };

      const response = await RoleFrontendService.getAll(params);
      setRoles(response.roles);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Error al cargar roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [currentPage, searchTerm]);

  const handleDelete = async (role: RoleType) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el rol ${role.name}?`)) {
      return;
    }

    try {
      await RoleFrontendService.delete(role.id);
      toast.success('Rol eliminado exitosamente');
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Error al eliminar rol');
    }
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
        <h2 className="text-2xl font-bold">Gestión de Roles</h2>
        {hasPermission('roles:create') && (
          <Button onClick={onRoleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Rol
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar roles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Permisos</TableHead>
              <TableHead>Usuarios</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  <p className="mt-2 text-sm text-muted-foreground">Cargando roles...</p>
                </TableCell>
              </TableRow>
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No se encontraron roles</p>
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow 
                  key={role.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRoleSelect?.(role)}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{role.name}</div>
                      <div className="text-sm text-muted-foreground">ID: {role.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="truncate" title={role.description}>
                      {role.description || <span className="text-muted-foreground">Sin descripción</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {role.permissions.length} permisos
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{role.userCount || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.active ? "default" : "secondary"}>
                      {role.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(role.created_at)}</TableCell>
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
                        {hasPermission('roles:edit') && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onRoleEdit?.(role);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {hasPermission('roles:manage_permissions') && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onManagePermissions?.(role);
                          }}>
                            <Key className="mr-2 h-4 w-4" />
                            Gestionar Permisos
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {hasPermission('roles:delete') && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(role);
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
    </div>
  );
}