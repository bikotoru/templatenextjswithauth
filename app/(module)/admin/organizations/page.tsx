'use client';

import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import OrganizationList from './components/organization-list';

export default function OrganizationsPage() {
  return (
    <DashboardLayout>
      <OrganizationList />
    </DashboardLayout>
  );
}