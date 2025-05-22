'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import OrganizationSelector from './organization-selector';
import { Organization } from '@/utils/auth';

interface LoginFormProps {
  onSuccess?: () => void;
}

interface DemoUser {
  email: string;
  password: string;
  role: string;
  org: string;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pendingUser, setPendingUser] = useState<{email: string; name: string} | null>(null);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.requiresOrganizationSelection) {
          // El usuario tiene múltiples organizaciones, mostrar selector
          setOrganizations(data.organizations);
          setPendingUser(data.user);
          setShowOrgSelector(true);
          setIsLoading(false);
          return;
        } else if (data.user) {
          // Login completo con organización única o ya seleccionada
          login(data.user);
          
          if (onSuccess) {
            onSuccess();
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        setError(data.error || 'Error en el login');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const demoUsers: DemoUser[] = [
    // 🔥 Usuarios demo fáciles (recomendados para testing)
    { email: 'admin@demo.com', password: '123456', role: '🔥 Super Admin', org: 'TechCorp' },
    { email: 'manager@demo.com', password: '123456', role: '🔥 HR Manager', org: 'Consultores' },
    { email: 'user@demo.com', password: '123456', role: '🔥 HR Analyst', org: 'InnovaStart' },
    { email: 'viewer@demo.com', password: '123456', role: '🔥 Viewer', org: 'TechCorp' },
    
    // 🎭 Usuario multi-tenant (mismo usuario, diferentes permisos por organización)
    { email: 'multiuser@example.cl', password: '123456', role: '🎭 Multi-Tenant', org: 'Todas las organizaciones' },
    
    // 👤 Usuarios multi-tenant originales
    { email: 'admin@techcorp.cl', password: '123456', role: '👤 Super Admin', org: 'TechCorp' },
    { email: 'maria.garcia@consultores.cl', password: '123456', role: '👤 HR Manager', org: 'Consultores' },
    { email: 'sofia@innovastart.cl', password: '123456', role: '👤 Super Admin', org: 'InnovaStart' },
  ];

  const fillDemoUser = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
  };

  const handleOrganizationSelect = async (organizationId: string) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: pendingUser?.email, 
          password, 
          organizationId 
        }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        login(data.user);
        
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(data.error || 'Error seleccionando organización');
        setShowOrgSelector(false);
      }
    } catch {
      setError('Error de conexión');
      setShowOrgSelector(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Si necesita seleccionar organización, mostrar el selector
  if (showOrgSelector && organizations.length > 0 && pendingUser) {
    return (
      <OrganizationSelector
        organizations={organizations}
        user={pendingUser}
        onSelectOrganization={handleOrganizationSelect}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Theme Toggle */}
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usuarios de Demostración</CardTitle>
            <CardDescription>
              Haz clic en cualquier usuario para llenar automáticamente el formulario. 
              Los usuarios 🔥 son recomendados para testing rápido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {demoUsers.map((user) => (
                <Button
                  key={user.email}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left"
                  onClick={() => fillDemoUser(user.email, user.password)}
                  disabled={isLoading}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{user.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.role} • {user.org} • Password: {user.password}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}