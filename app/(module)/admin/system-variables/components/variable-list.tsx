'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  SystemVariable, 
  VariableType, 
  VariableCategory,
  VARIABLE_TYPE_LABELS,
  VARIABLE_CATEGORY_LABELS
} from '../types';
import { SystemVariableFrontendService } from '../services/frontend.service';
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
  Settings,
  History,
  Play,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface VariableListProps {
  variables: SystemVariable[];
  isLoading: boolean;
  onEdit: (variable: SystemVariable) => void;
  onRefresh: () => void;
}

export default function VariableList({ variables: propVariables, isLoading, onEdit, onRefresh }: VariableListProps) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const [variables, setVariables] = useState<SystemVariable[]>(propVariables);
  const loading = isLoading;
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1);

  useEffect(() => {
    setVariables(propVariables);
  }, [propVariables]);

  const handleEdit = (variable: SystemVariable) => {
    onEdit(variable);
  };

  const handleDelete = async (variable: SystemVariable) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la variable "${variable.display_name}"?`)) {
      return;
    }

    try {
      await SystemVariableFrontendService.delete(variable.id);
      toast.success('Variable eliminada exitosamente');
      onRefresh();
    } catch (error) {
      console.error('Error deleting variable:', error);
      toast.error('Error al eliminar la variable');
    }
  };

  const handleGenerateNumber = async (variable: SystemVariable) => {
    if (variable.variable_type !== VariableType.INCREMENTAL) {
      toast.error('Solo se pueden generar números para variables incrementales');
      return;
    }

    try {
      const result = await SystemVariableFrontendService.generateNumber(
        variable.variable_key,
        `Generación manual desde interfaz admin`
      );

      if (result.success) {
        toast.success(`Número generado: ${result.generated_code}`);
        onRefresh(); // Actualizar para ver el nuevo contador
      } else {
        toast.error(result.error_message || 'Error al generar número');
      }
    } catch (error) {
      console.error('Error generating number:', error);
      toast.error('Error al generar número');
    }
  };

  const getVariableTypeIcon = (type: VariableType) => {
    switch (type) {
      case VariableType.INCREMENTAL: return '🔢';
      case VariableType.TEXT: return '📝';
      case VariableType.NUMBER: return '🔢';
      case VariableType.DATE: return '📅';
      case VariableType.BOOLEAN: return '✓';
      case VariableType.JSON: return '📋';
      default: return '❓';
    }
  };

  const getVariableValue = (variable: SystemVariable) => {
    if (variable.variable_type === VariableType.INCREMENTAL) {
      const config = variable.incremental_config;
      if (config) {
        const nextNumber = config.prefix + 
          String(config.current_number + 1).padStart(config.number_length, '0') + 
          (config.suffix || '');
        return `Próximo: ${nextNumber}`;
      }
      return 'No configurado';
    }

    const value = variable.current_value;
    if (!value) return 'Sin valor';

    switch (variable.variable_type) {
      case VariableType.TEXT:
        return value.text_value || 'Sin valor';
      case VariableType.NUMBER:
        return value.number_value?.toString() || 'Sin valor';
      case VariableType.DATE:
        return value.date_value ? new Date(value.date_value).toLocaleDateString() : 'Sin valor';
      case VariableType.BOOLEAN:
        return value.boolean_value !== undefined ? (value.boolean_value ? 'Verdadero' : 'Falso') : 'Sin valor';
      case VariableType.JSON:
        return value.text_value ? 'Configurado' : 'Sin valor';
      default:
        return 'Sin valor';
    }
  };

  const getCategoryBadgeColor = (category?: VariableCategory) => {
    switch (category) {
      case VariableCategory.NUMBERING: return 'bg-blue-100 text-blue-800';
      case VariableCategory.LIMITS: return 'bg-red-100 text-red-800';
      case VariableCategory.SETTINGS: return 'bg-green-100 text-green-800';
      case VariableCategory.DATES: return 'bg-purple-100 text-purple-800';
      case VariableCategory.BUSINESS_RULES: return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Variables del Sistema</h1>
        </div>
        {hasPermission('system_variables:create') && (
          <Button onClick={() => router.push('/admin/system-variables/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Variable
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar variables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {Object.entries(VARIABLE_CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(VARIABLE_TYPE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variable</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Valor Actual</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-muted-foreground mt-2">Cargando variables...</p>
                </TableCell>
              </TableRow>
            ) : variables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No se encontraron variables' : 'No hay variables configuradas'}
                  </p>
                  {!searchTerm && hasPermission('system_variables:create') && (
                    <Button 
                      className="mt-2" 
                      onClick={() => router.push('/admin/system-variables/create')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear primera variable
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              variables.map((variable) => (
                <TableRow 
                  key={variable.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleEdit(variable)}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getVariableTypeIcon(variable.variable_type)}</span>
                        <div>
                          <div className="font-medium">{variable.display_name}</div>
                          <div className="text-sm text-muted-foreground">{variable.variable_key}</div>
                        </div>
                      </div>
                      {variable.description && (
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs truncate">
                          {variable.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {VARIABLE_TYPE_LABELS[variable.variable_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {variable.category && (
                      <Badge className={getCategoryBadgeColor(variable.category)}>
                        {VARIABLE_CATEGORY_LABELS[variable.category]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {getVariableValue(variable)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={variable.is_active ? 'default' : 'secondary'}>
                      {variable.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        
                        {variable.variable_type === VariableType.INCREMENTAL && (
                          <>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateNumber(variable);
                              }}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Generar Número
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(variable);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/system-variables/${variable.id}/history`);
                          }}
                        >
                          <History className="mr-2 h-4 w-4" />
                          Ver Historial
                        </DropdownMenuItem>
                        
                        {!variable.is_system && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(variable);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}