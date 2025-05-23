'use client';

import { useRouter } from 'next/navigation';
import { RoleType } from '@/app/(module)/admin/roles/types';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import RoleList from '@/app/(module)/admin/roles/components/role-list';
import { Toaster } from '@/components/ui/sonner';

export default function RolesPage() {
  const router = useRouter();
  //const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);

  const handleRoleSelect = (_role: RoleType) => {
    // Reserved for future use
  };

  const handleRoleEdit = (role: RoleType) => {
    router.push(`/admin/roles/${role.id}/edit`);
  };

  const handleRoleCreate = () => {
    router.push('/admin/roles/create');
  };

  const handleManagePermissions = (role: RoleType) => {
    router.push(`/admin/roles/${role.id}/edit?tab=permissions`);
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