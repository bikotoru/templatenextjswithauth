'use client';

import DashboardLayout from '@/app/(module)/dashboard/components/dashboard-layout';
import OrganizationList from '@/app/(module)/admin/organizations/components/organization-list';

export default function OrganizationsPage() {
  return (
    <DashboardLayout>
      <OrganizationList />
    </DashboardLayout>
  );
}