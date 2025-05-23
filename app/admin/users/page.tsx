'use client';

import { useRouter } from 'next/navigation';
import { UserType } from '@/app/(module)/admin/users/types';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import UserList from '@/app/(module)/admin/users/components/user-list';
import { Toaster } from '@/components/ui/sonner';

export default function UsersPage() {
  const router = useRouter();

  const handleUserSelect = (_user: UserType) => {
    // Reserved for future use
  };

  const handleUserEdit = (user: UserType) => {
    router.push(`/admin/users/${user.id}/edit`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <UserList
          onUserSelect={handleUserSelect}
          onUserEdit={handleUserEdit}
        />
      </div>
      <Toaster />
    </DashboardLayout>
  );
}