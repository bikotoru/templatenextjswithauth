'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(data.error || 'Error en el login');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const demoUsers = [
    { email: 'admin@admin.cl', password: '123', role: 'Super Admin' },
    { email: 'manager@demo.cl', password: 'manager123', role: 'Manager' },
    { email: 'user@demo.cl', password: 'user123', role: 'User' },
    { email: 'viewer@demo.cl', password: 'viewer123', role: 'Viewer' },
  ];

  const fillDemoUser = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
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
              Haz clic en cualquier usuario para llenar automáticamente el formulario
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
                      {user.role} - Password: {user.password}
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