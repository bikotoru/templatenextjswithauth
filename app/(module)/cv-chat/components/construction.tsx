'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConstructionPage() {
  return (
    <div className="flex items-center justify-center h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Módulo en Construcción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            <div className="text-6xl">🚧</div>
            <p className="text-center text-muted-foreground">
              El módulo de chat con CVs está actualmente en desarrollo y estará disponible próximamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
