'use client';

import { useState } from 'react';
import { UserType } from '@/app/(module)/admin/users/types';
import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import UserList from '@/app/(module)/admin/users/components/user-list';
import UserForm from '@/app/(module)/admin/users/components/user-form';
import { Toaster } from '@/components/ui/sonner';

export default function UsersPage() {
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);

  const handleUserSelect = (user: UserType) => {
    setSelectedUser(user);
  };

  const handleUserEdit = (user: UserType) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleUserCreate = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    // Refresh the user list by updating key
    setSelectedUser(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <UserList
          onUserSelect={handleUserSelect}
          onUserEdit={handleUserEdit}
          onUserCreate={handleUserCreate}
        />

        <UserForm
          user={editingUser}
          open={showForm}
          onOpenChange={setShowForm}
          onSuccess={handleFormSuccess}
        />
      </div>
      <Toaster />
    </DashboardLayout>
  );
}