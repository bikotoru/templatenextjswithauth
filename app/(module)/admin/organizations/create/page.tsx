'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import OrganizationForm from '../components/organization-form';

export default function CreateOrganizationPage() {
  const router = useRouter();
  const { isSuperAdmin } = useAuth();

  // Solo Super Admin puede acceder
  if (!isSuperAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Acceso Restringido</h3>
          <p className="text-muted-foreground">
            Solo Super Admin puede crear organizaciones
          </p>
        </div>
      </div>
    );
  }

  const handleSuccess = () => {
    router.push('/admin/organizations');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container max-w-4xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Nueva Organización</h1>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Organización</CardTitle>
          <CardDescription>
            Complete los datos para crear una nueva organización en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationForm
            organization={null}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            showAsPage={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}