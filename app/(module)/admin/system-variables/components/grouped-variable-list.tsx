'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Edit, 
  Trash2, 
  Settings, 
  Play, 
  Shield, 
  Lock, 
  Unlock,
  Users,
  Building2,
  Loader2,
  Database,
  Hash
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  SystemVariable, 
  SystemVariableGroup,
  VariableType,
  VARIABLE_TYPE_LABELS,
  VARIABLE_CATEGORY_LABELS
} from '../types';
import { useAuth } from '@/contexts/auth-context';

interface GroupedVariableListProps {
  variables: SystemVariable[];
  groups: SystemVariableGroup[];
  isLoading?: boolean;
  onEdit?: (variable: SystemVariable) => void;
  onDelete?: (variable: SystemVariable) => void;
  onGenerate?: (variable: SystemVariable) => void;
  onSetValue?: (variable: SystemVariable) => void;
}

interface GroupedVariables {
  [groupId: string]: {
    group: SystemVariableGroup;
    variables: SystemVariable[];
  };
}

export function GroupedVariableList({
  variables,
  groups,
  isLoading,
  onEdit,
  onDelete,
  onGenerate,
  onSetValue
}: GroupedVariableListProps) {
  const { hasPermission, user } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Agrupar variables
  const groupedVariables: GroupedVariables = {};
  const ungroupedVariables: SystemVariable[] = [];

  // Inicializar grupos
  groups.forEach(group => {
    groupedVariables[group.id.toString()] = {
      group,
      variables: []
    };
  });

  // Distribuir variables
  variables.forEach(variable => {
    if (variable.group_id && groupedVariables[variable.group_id.toString()]) {
      groupedVariables[variable.group_id.toString()].variables.push(variable);
    } else {
      ungroupedVariables.push(variable);
    }
  });

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const canEditVariable = (variable: SystemVariable) => {
    if (!variable.is_editable) return false;
    if (!variable.edit_permission) return true; // Sin permiso específico, permitir edición
    return hasPermission(variable.edit_permission);
  };

  const canDeleteVariable = (variable: SystemVariable) => {
    // Solo Super Admin en organización SYSTEM puede eliminar variables system_level_only
    if (variable.system_level_only) {
      return user?.roles?.includes('Super Admin') && 
             user?.currentOrganization?.name === 'SYSTEM';
    }
    return hasPermission('system_variables:delete');
  };

  const getVariableTypeIcon = (type: VariableType) => {
    switch (type) {
      case VariableType.INCREMENTAL:
        return <Hash className="w-4 h-4" />;
      case VariableType.TEXT:
        return <Database className="w-4 h-4" />;
      case VariableType.NUMBER:
        return <Hash className="w-4 h-4" />;
      case VariableType.BOOLEAN:
        return <Settings className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  const getVariableStatusBadge = (variable: SystemVariable) => {
    const badges = [];

    if (variable.system_level_only) {
      badges.push(
        <Badge key="system" variant="destructive" className="text-xs">
          <Building2 className="w-3 h-3 mr-1" />
          SYSTEM
        </Badge>
      );
    }

    if (variable.is_editable) {
      badges.push(
        <Badge key="editable" variant="secondary" className="text-xs">
          <Unlock className="w-3 h-3 mr-1" />
          Editable
        </Badge>
      );
    } else {
      badges.push(
        <Badge key="readonly" variant="outline" className="text-xs">
          <Lock className="w-3 h-3 mr-1" />
          Solo Lectura
        </Badge>
      );
    }

    if (variable.is_required) {
      badges.push(
        <Badge key="required" variant="default" className="text-xs">
          Requerida
        </Badge>
      );
    }

    return badges;
  };

  const VariableRow = ({ variable }: { variable: SystemVariable }) => (
    <TableRow key={variable.id}>
      <TableCell>
        <div className="flex items-center gap-2">
          {getVariableTypeIcon(variable.variable_type)}
          <div>
            <div className="font-medium">{variable.display_name}</div>
            <div className="text-sm text-muted-foreground">{variable.variable_key}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">
          {VARIABLE_TYPE_LABELS[variable.variable_type]}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">
          {VARIABLE_CATEGORY_LABELS[variable.category!]}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {getVariableStatusBadge(variable)}
        </div>
      </TableCell>
      <TableCell>
        {variable.incremental_config ? (
          <div className="text-sm">
            <div>{variable.incremental_config.prefix}XXXXXXXX{variable.incremental_config.suffix}</div>
            <div className="text-muted-foreground">
              Actual: {variable.incremental_config.current_number}
            </div>
          </div>
        ) : variable.current_value ? (
          <div className="text-sm">
            {variable.current_value.text_value || 
             variable.current_value.number_value || 
             (variable.current_value.boolean_value ? 'Verdadero' : 'Falso') ||
             'N/A'}
          </div>
        ) : (
          <span className="text-muted-foreground">Sin valor</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEditVariable(variable) && (
              <DropdownMenuItem onClick={() => onEdit?.(variable)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            )}
            
            {variable.variable_type === VariableType.INCREMENTAL && onGenerate && (
              <DropdownMenuItem onClick={() => onGenerate(variable)}>
                <Play className="mr-2 h-4 w-4" />
                Generar Número
              </DropdownMenuItem>
            )}
            
            {variable.variable_type !== VariableType.INCREMENTAL && onSetValue && canEditVariable(variable) && (
              <DropdownMenuItem onClick={() => onSetValue(variable)}>
                <Settings className="mr-2 h-4 w-4" />
                Establecer Valor
              </DropdownMenuItem>
            )}
            
            {canDeleteVariable(variable) && (
              <DropdownMenuItem 
                onClick={() => onDelete?.(variable)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Cargando variables...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TooltipProvider>
        {/* Variables Agrupadas */}
        {Object.entries(groupedVariables).map(([groupId, { group, variables: groupVars }]) => {
          if (groupVars.length === 0) return null;
          
          const isExpanded = expandedGroups.has(groupId);
          
          return (
            <Card key={groupId}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(groupId)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span>{group.name}</span>
                        <Badge variant="secondary">
                          {groupVars.length} variable{groupVars.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardTitle>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.description}
                      </p>
                    )}
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Variable</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Valor Actual</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupVars.map((variable) => (
                          <VariableRow key={variable.id} variable={variable} />
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {/* Variables Sin Grupo */}
        {ungroupedVariables.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Variables Sin Grupo
                <Badge variant="secondary">
                  {ungroupedVariables.length} variable{ungroupedVariables.length !== 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variable</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Valor Actual</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ungroupedVariables.map((variable) => (
                    <VariableRow key={variable.id} variable={variable} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Estado Vacío */}
        {variables.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No hay variables configuradas</h3>
                <p>Comience creando su primera variable del sistema.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </TooltipProvider>
    </div>
  );
}