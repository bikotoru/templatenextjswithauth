'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Building2, Check, Search, X } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Organization } from '@/utils/auth';

interface OrganizationSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: Organization[];
  currentOrganization: Organization | null;
  onSelectOrganization: (organizationId: string) => Promise<void>;
  isLoading?: boolean;
}

export function OrganizationSelectorModal({
  open,
  onOpenChange,
  organizations,
  currentOrganization,
  onSelectOrganization,
  isLoading = false
}: OrganizationSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [switchingToId, setSwitchingToId] = useState<string | null>(null);

  // Filtrar organizaciones basado en la búsqueda
  const filteredOrganizations = useMemo(() => {
    if (!searchQuery.trim()) return organizations;
    
    const query = searchQuery.toLowerCase();
    return organizations.filter(org => 
      org.name.toLowerCase().includes(query) ||
      org.rut?.toLowerCase().includes(query)
    );
  }, [organizations, searchQuery]);

  const handleSelectOrganization = async (orgId: string) => {
    if (orgId === currentOrganization?.id || switchingToId) return;
    
    setSwitchingToId(orgId);
    try {
      await onSelectOrganization(orgId);
      onOpenChange(false);
      setSearchQuery(''); // Limpiar búsqueda al cerrar
    } catch (error) {
      console.error('Error switching organization:', error);
    } finally {
      setSwitchingToId(null);
    }
  };

  const handleClose = () => {
    if (!isLoading && !switchingToId) {
      onOpenChange(false);
      setSearchQuery(''); // Limpiar búsqueda al cerrar
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[600px] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>Seleccionar Organización</span>
          </DialogTitle>
          <DialogDescription>
            Cambia entre las organizaciones a las que tienes acceso.
          </DialogDescription>
        </DialogHeader>
        
        {/* Barra de búsqueda */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar organizaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
              disabled={isLoading || switchingToId !== null}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading || switchingToId !== null}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de organizaciones */}
        <ScrollArea className="max-h-[400px] px-6 pb-6">
          {filteredOrganizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? (
                <>
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No se encontraron organizaciones</p>
                  <p className="text-sm">Intenta con otro término de búsqueda</p>
                </>
              ) : (
                <>
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No hay organizaciones disponibles</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrganizations.map((org) => {
                const isCurrentOrg = currentOrganization?.id === org.id;
                const isSwitching = switchingToId === org.id;
                
                return (
                  <button
                    key={org.id}
                    onClick={() => handleSelectOrganization(org.id)}
                    disabled={isLoading || switchingToId !== null}
                    className={`
                      w-full p-4 rounded-lg border-2 transition-all duration-200 text-left
                      ${isCurrentOrg 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                      ${(isLoading || switchingToId !== null) && !isSwitching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      ${isSwitching ? 'opacity-75 cursor-wait' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* Logo o icono de organización */}
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                          {org.logo ? (
                            <img 
                              src={org.logo} 
                              alt={`Logo ${org.name}`}
                              className="w-8 h-8 object-contain rounded"
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        
                        {/* Información de la organización */}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm truncate">{org.name}</h3>
                          {org.rut && (
                            <p className="text-xs text-muted-foreground">RUT: {org.rut}</p>
                          )}
                          {isCurrentOrg && (
                            <p className="text-xs text-primary font-medium">Organización actual</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Indicadores de estado */}
                      <div className="flex items-center space-x-2">
                        {isSwitching && (
                          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                        )}
                        {isCurrentOrg && !isSwitching && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer con información */}
        {filteredOrganizations.length > 0 && (
          <div className="px-6 py-4 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              {filteredOrganizations.length} de {organizations.length} organizaciones
              {searchQuery && ` que coinciden con "${searchQuery}"`}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}