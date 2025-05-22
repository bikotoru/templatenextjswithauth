'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Building2, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganizationType } from '../../types';
import { OrganizationFrontendService } from '../../services/frontend.service';
import OrganizationForm from '../../components/organization-form';
import { toast } from 'sonner';

export default function EditOrganizationPage() {
  const router = useRouter();
  const params = useParams();
  const { isSuperAdmin } = useAuth();
  const [organization, setOrganization] = useState<OrganizationType | null>(null);
  const [loading, setLoading] = useState(true);

  const organizationId = params.id as string;

  // Solo Super Admin puede acceder
  if (!isSuperAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Acceso Restringido</h3>
          <p className="text-muted-foreground">
            Solo Super Admin puede editar organizaciones
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!organizationId) return;
      
      try {
        setLoading(true);
        const result = await OrganizationFrontendService.getById(organizationId);
        setOrganization(result);
      } catch (error) {
        console.error('Error fetching organization:', error);
        toast.error('Error al cargar la organización');
        router.push('/admin/organizations');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [organizationId, router]);

  const handleSuccess = () => {
    router.push('/admin/organizations');
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando organización...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Organización no encontrada</h3>
          <p className="text-muted-foreground mb-4">
            La organización que buscas no existe o no tienes permisos para verla.
          </p>
          <Button onClick={() => router.push('/admin/organizations')}>
            Volver a Organizaciones
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-6">
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
          <div>
            <h1 className="text-2xl font-bold">{organization.name}</h1>
            <p className="text-muted-foreground">Gestionar organización</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Organización</CardTitle>
              <CardDescription>
                Gestiona los datos básicos de la organización.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationForm
                organization={organization}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
                showAsPage={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios Asignados</CardTitle>
              <CardDescription>
                Gestiona los usuarios que pertenecen a esta organización.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Gestión de usuarios por implementar
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas</CardTitle>
              <CardDescription>
                Información sobre el uso y actividad de la organización.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Estadísticas por implementar
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}