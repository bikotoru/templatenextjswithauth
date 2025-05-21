'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserType } from '@/app/(module)/admin/users/types';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import UserList from '@/app/(module)/admin/users/components/user-list';
import { Toaster } from '@/components/ui/sonner';

export default function UsersPage() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  const handleUserSelect = (user: UserType) => {
    setSelectedUser(user);
  };

  const handleUserEdit = (user: UserType) => {
    router.push(`/admin/users/${user.id}/edit`);
  };

  const handleUserCreate = () => {
    router.push('/admin/users/create');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <UserList
          onUserSelect={handleUserSelect}
          onUserEdit={handleUserEdit}
          onUserCreate={handleUserCreate}
        />
      </div>
      <Toaster />
    </DashboardLayout>
  );
}