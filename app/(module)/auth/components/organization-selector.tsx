'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, ChevronRight, Search, X } from 'lucide-react';
import { Organization } from '@/utils/auth';
import { ThemeToggle } from '@/components/theme-toggle';

interface OrganizationSelectorProps {
  organizations: Organization[];
  user: {
    name: string;
    email: string;
  };
  onSelectOrganization: (organizationId: string) => void;
  isLoading?: boolean;
}

export default function OrganizationSelector({
  organizations,
  user,
  onSelectOrganization,
  isLoading = false
}: OrganizationSelectorProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Filtrar organizaciones basado en la búsqueda
  const filteredOrganizations = useMemo(() => {
    if (!searchQuery.trim()) return organizations;
    
    const query = searchQuery.toLowerCase();
    return organizations.filter(org => 
      org.name.toLowerCase().includes(query) ||
      org.rut?.toLowerCase().includes(query)
    );
  }, [organizations, searchQuery]);

  const handleContinue = () => {
    if (selectedOrgId) {
      onSelectOrganization(selectedOrgId);
    }
  };

  // Auto-focus en el campo de búsqueda cuando hay múltiples organizaciones
  React.useEffect(() => {
    if (organizations.length > 1 && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [organizations.length]);

  // Limpiar búsqueda cuando cambia la lista de organizaciones
  React.useEffect(() => {
    setSearchQuery('');
  }, [organizations]);

  // Manejar teclas en el input de búsqueda
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Si hay solo una organización filtrada, seleccionarla automáticamente
      if (filteredOrganizations.length === 1) {
        setSelectedOrgId(filteredOrganizations[0].id);
      }
      // Si ya hay una seleccionada, continuar
      else if (selectedOrgId) {
        handleContinue();
      }
    }
    // Escape para limpiar búsqueda
    else if (e.key === 'Escape') {
      setSearchQuery('');
      searchInputRef.current?.blur();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-6">
        {/* Theme Toggle */}
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center space-x-2">
              <Building2 className="w-6 h-6" />
              <span>Seleccionar Organización</span>
            </CardTitle>
            <CardDescription>
              Hola {user.name}, tienes acceso a múltiples organizaciones. 
              Selecciona con cuál deseas conectarte.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Barra de búsqueda */}
            {organizations.length > 1 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar organizaciones... (Enter para seleccionar)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-9 pr-9"
                  disabled={isLoading}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Lista de organizaciones */}
            <ScrollArea className="max-h-[400px]">
              {filteredOrganizations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No se encontraron organizaciones</p>
                  <p className="text-sm">Intenta con otro término de búsqueda</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredOrganizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => setSelectedOrgId(org.id)}
                      disabled={isLoading}
                      className={`
                        p-4 rounded-lg border-2 transition-all duration-200 text-left
                        ${selectedOrgId === org.id 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
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
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm truncate">{org.name}</h3>
                            {org.rut && (
                              <p className="text-xs text-muted-foreground">RUT: {org.rut}</p>
                            )}
                          </div>
                        </div>
                        {selectedOrgId === org.id && (
                          <ChevronRight className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            <Button
              onClick={handleContinue}
              disabled={!selectedOrgId || isLoading || filteredOrganizations.length === 0}
              className="w-full mt-6"
            >
              {isLoading ? 'Conectando...' : 'Continuar'}
            </Button>

            <div className="text-center text-sm text-muted-foreground mt-4 space-y-1">
              <p>Conectándose como: <span className="font-medium">{user.email}</span></p>
              {organizations.length > 1 && (
                <p className="text-xs">
                  {searchQuery ? (
                    <>
                      {filteredOrganizations.length} de {organizations.length} organizaciones
                      {searchQuery && ` que coinciden con "${searchQuery}"`}
                    </>
                  ) : (
                    `${organizations.length} organizaciones disponibles`
                  )}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}