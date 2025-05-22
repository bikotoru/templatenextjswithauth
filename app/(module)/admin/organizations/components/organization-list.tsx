'use client';

import { useState, useEffect } from 'react';
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
import OrganizationForm from './organization-form';

interface OrganizationListProps {
  onOrganizationSelect?: (organization: OrganizationType) => void;
}

export default function OrganizationList({ onOrganizationSelect }: OrganizationListProps) {
  const { isSuperAdmin } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  // Estados para los modales
  const [showOrganizationForm, setShowOrganizationForm] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationType | null>(null);

  const pageSize = 10;

  // Solo mostrar si es Super Admin
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

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const params: OrganizationSearchParams = {
        search: searchTerm || undefined,
        active: activeFilter === 'all' ? undefined : activeFilter === 'active',
        page: currentPage,
        pageSize,
        sortBy: 'created_at',
        sortOrder: 'DESC'
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
  }, [searchTerm, activeFilter, currentPage]);

  const handleEdit = (organization: OrganizationType) => {
    setSelectedOrganization(organization);
    setShowOrganizationForm(true);
  };

  const handleCreate = () => {
    setSelectedOrganization(null);
    setShowOrganizationForm(true);
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

  const handleFormSuccess = () => {
    fetchOrganizations();
    setShowOrganizationForm(false);
    setSelectedOrganization(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL');
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
      <div className="flex gap-4 items-center">
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="inactive">Inactivas</SelectItem>
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
              <TableHead>Creada</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="mt-2 text-muted-foreground">Cargando organizaciones...</p>
                </TableCell>
              </TableRow>
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
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

      {/* Modales */}
      <OrganizationForm
        organization={selectedOrganization}
        open={showOrganizationForm}
        onOpenChange={setShowOrganizationForm}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}