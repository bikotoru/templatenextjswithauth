'use client';

import { useState, useEffect } from 'react';
import { UserFrontendService } from '../services/frontend.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, Lock, AlertTriangle } from 'lucide-react';

interface ChangePasswordFormProps {
  userId: number;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ChangePasswordForm({ 
  userId, 
  userEmail, 
  open, 
  onOpenChange, 
  onSuccess 
}: ChangePasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [canChange, setCanChange] = useState<{ canChangePassword: boolean; reason?: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (open && userId) {
      checkPasswordPermission();
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [open, userId]);

  const checkPasswordPermission = async () => {
    setChecking(true);
    try {
      const result = await UserFrontendService.canChangePassword(userId);
      setCanChange(result);
    } catch (error) {
      console.error('Error checking password permission:', error);
      toast.error('Error al verificar permisos');
      setCanChange({ canChangePassword: false, reason: 'Error al verificar permisos' });
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await UserFrontendService.changePassword(userId, newPassword);
      toast.success('Contraseña actualizada exitosamente');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Verificando permisos...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (canChange && !canChange.canChangePassword) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              No se puede cambiar la contraseña
            </DialogTitle>
            <DialogDescription>
              Usuario: {userEmail}
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Motivo:</strong> {canChange.reason}
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Política de seguridad:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Solo se puede cambiar la contraseña de usuarios que pertenezcan únicamente a su organización</li>
              <li>Los usuarios en múltiples organizaciones solo pueden ser gestionados por Super Admin</li>
              <li>Esto protege la seguridad de otras organizaciones</li>
            </ul>
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Cambiar Contraseña
          </DialogTitle>
          <DialogDescription>
            Usuario: {userEmail}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repetir la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Las contraseñas no coinciden
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cambiar Contraseña
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}