'use client';

import { useState } from 'react';
import { RoleType } from '@/app/(module)/admin/roles/types';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import RoleList from '@/app/(module)/admin/roles/components/role-list';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);

  const handleRoleSelect = (role: RoleType) => {
    setSelectedRole(role);
  };

  const handleRoleEdit = (role: RoleType) => {
    // TODO: Implement role edit form
    toast.info('Función de edición en desarrollo');
  };

  const handleRoleCreate = () => {
    // TODO: Implement role create form  
    toast.info('Función de creación en desarrollo');
  };

  const handleManagePermissions = (role: RoleType) => {
    // TODO: Implement permissions management
    toast.info('Gestión de permisos en desarrollo');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <RoleList
          onRoleSelect={handleRoleSelect}
          onRoleEdit={handleRoleEdit}
          onRoleCreate={handleRoleCreate}
          onManagePermissions={handleManagePermissions}
        />
      </div>
      <Toaster />
    </DashboardLayout>
  );
}