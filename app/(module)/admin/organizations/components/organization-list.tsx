'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OrganizationType, OrganizationSearchParams } from '../types';
import { OrganizationFrontendService } from '../services/frontend.service';
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
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2,
  Users,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface OrganizationListProps {
  onOrganizationSelect?: (organization: OrganizationType) => void;
}

export default function OrganizationList({ onOrganizationSelect }: OrganizationListProps) {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  
  // Solo mostrar si es Super Admin - verificar antes de cualquier hook
  if (!isSuperAdmin()) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Acceso Restringido</h3>
          <p className="text-muted-foreground">
            Solo Super Admin puede gestionar organizaciones
          </p>
        </div>
      </div>
    );
  }

  const [organizations, setOrganizations] = useState<OrganizationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expirationFilter, setExpirationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  // Ya no necesitamos estados para modales

  const pageSize = 10;

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const params: OrganizationSearchParams = {
        search: searchTerm || undefined,
        active: activeFilter === 'all' ? undefined : activeFilter === 'active',
        expired: expirationFilter === 'expired' ? true : expirationFilter === 'not_expired' ? false : undefined,
        expiringThisMonth: expirationFilter === 'expiring_this_month' ? true : undefined,
        page: currentPage,
        pageSize,
        sortBy,
        sortOrder
      };
      
      const result = await OrganizationFrontendService.getAll(params);
      setOrganizations(result.organizations);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Error al cargar organizaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [searchTerm, activeFilter, expirationFilter, sortBy, sortOrder, currentPage]);

  const handleEdit = (organization: OrganizationType) => {
    router.push(`/admin/organizations/${organization.id}/edit`);
  };

  const handleCreate = () => {
    router.push('/admin/organizations/create');
  };

  const handleDelete = async (organization: OrganizationType) => {
    if (!confirm(`¿Está seguro de eliminar la organización "${organization.name}"?`)) {
      return;
    }

    try {
      await OrganizationFrontendService.delete(organization.id);
      toast.success('Organización eliminada exitosamente');
      fetchOrganizations();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar organización');
    }
  };

  // Ya no necesitamos handleFormSuccess

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  const formatExpirationDate = (expiresAt: string | null) => {
    if (!expiresAt) return 'Nunca expira';
    const date = new Date(expiresAt);
    const now = new Date();
    const isExpired = date < now;
    const isExpiringThisMonth = date > now && date <= new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    return {
      text: date.toLocaleDateString('es-CL'),
      isExpired,
      isExpiringThisMonth
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Gestión de Organizaciones</h2>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Organización
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar organizaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="inactive">Inactivas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={expirationFilter} onValueChange={setExpirationFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Expiración" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="not_expired">Vigentes</SelectItem>
            <SelectItem value="expired">Expiradas</SelectItem>
            <SelectItem value="expiring_this_month">Expiran este mes</SelectItem>
          </SelectContent>
        </Select>

        <Select value={`${sortBy}_${sortOrder}`} onValueChange={(value) => {
          const [field, order] = value.split('_');
          setSortBy(field);
          setSortOrder(order as 'ASC' | 'DESC');
        }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at_DESC">Más recientes</SelectItem>
            <SelectItem value="created_at_ASC">Más antiguos</SelectItem>
            <SelectItem value="name_ASC">Nombre A-Z</SelectItem>
            <SelectItem value="name_DESC">Nombre Z-A</SelectItem>
            <SelectItem value="expires_at_ASC">Expiran primero</SelectItem>
            <SelectItem value="expires_at_DESC">Expiran último</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organización</TableHead>
              <TableHead>RUT</TableHead>
              <TableHead>Usuarios</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Expiración</TableHead>
              <TableHead>Creada</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="mt-2 text-muted-foreground">Cargando organizaciones...</p>
                </TableCell>
              </TableRow>
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No se encontraron organizaciones</p>
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((organization) => (
                <TableRow 
                  key={organization.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onOrganizationSelect?.(organization)}
                >
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={organization.logo} alt={organization.name} />
                        <AvatarFallback>
                          <Building2 className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{organization.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {organization.rut ? (
                      <code className="text-sm bg-muted px-1 py-0.5 rounded">
                        {organization.rut}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{organization.userCount || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={organization.active ? 'default' : 'secondary'}>
                      {organization.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const expiration = formatExpirationDate(organization.expires_at);
                      if (typeof expiration === 'string') {
                        return <span className="text-muted-foreground">{expiration}</span>;
                      }
                      return (
                        <div className="flex flex-col">
                          <span className={`text-sm ${
                            expiration.isExpired ? 'text-red-600 font-medium' : 
                            expiration.isExpiringThisMonth ? 'text-yellow-600 font-medium' : 
                            'text-muted-foreground'
                          }`}>
                            {expiration.text}
                          </span>
                          {expiration.isExpired && (
                            <Badge variant="destructive" className="w-fit text-xs">Expirada</Badge>
                          )}
                          {expiration.isExpiringThisMonth && !expiration.isExpired && (
                            <Badge variant="outline" className="w-fit text-xs border-yellow-500 text-yellow-600">Por expirar</Badge>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {formatDate(organization.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(organization);
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(organization);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Ya no necesitamos modales */}
    </div>
  );
}