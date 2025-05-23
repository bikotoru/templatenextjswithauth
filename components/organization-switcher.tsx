'use client';

import * as React from 'react';
import { Building2, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { OrganizationSelectorModal } from './organization-selector-modal';

export function OrganizationSwitcher() {
  const { user, currentOrganization, switchOrganization } = useAuth();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [allOrganizations, setAllOrganizations] = React.useState<any[]>([]);
  const [loadingOrgs, setLoadingOrgs] = React.useState(false);

  const isSuperAdmin = user?.roles?.includes('Super Admin') || false;

  // Cargar todas las organizaciones si es Super Admin
  React.useEffect(() => {
    if (isSuperAdmin && isModalOpen) {
      loadAllOrganizations();
    }
  }, [isSuperAdmin, isModalOpen]);

  const loadAllOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const response = await fetch('/api/admin/organizations?page=1&pageSize=100&sortBy=name&sortOrder=ASC');
      if (response.ok) {
        const data = await response.json();
        setAllOrganizations(data.data?.organizations || []);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  if (!isSuperAdmin && (!user?.organizations || user.organizations.length <= 1)) {
    // No mostrar el switcher si no hay múltiples organizaciones (para usuarios normales)
    return null;
  }

  const handleSwitchOrganization = async (orgId: string) => {
    if (orgId === currentOrganization?.id) return;
    
    setIsLoading(true);
    try {
      const success = await switchOrganization(orgId);
      if (!success) {
        console.error('Failed to switch organization');
        throw new Error('Failed to switch organization');
      }
    } catch (error) {
      console.error('Error switching organization:', error);
      throw error; // Re-throw para que el modal pueda manejarlo
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="w-[200px] justify-between"
        onClick={() => setIsModalOpen(true)}
        disabled={isLoading}
      >
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center">
            {currentOrganization?.logo ? (
              <img 
                src={currentOrganization.logo} 
                alt={`Logo ${currentOrganization.name}`}
                className="w-4 h-4 object-contain rounded"
              />
            ) : (
              <Building2 className="w-3 h-3 text-primary" />
            )}
          </div>
          <span className="truncate text-sm">
            {currentOrganization?.name || 'Seleccionar organización'}
          </span>
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <OrganizationSelectorModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        organizations={isSuperAdmin ? (allOrganizations || []) : (user?.organizations || [])}
        currentOrganization={currentOrganization}
        onSelectOrganization={handleSwitchOrganization}
        isLoading={isLoading || loadingOrgs}
      />
    </>
  );
}