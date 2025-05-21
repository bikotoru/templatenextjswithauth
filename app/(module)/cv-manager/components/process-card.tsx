'use client';

import { File, AlertTriangle, Check, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import ProcessStatus from './process-status';

interface ProcessCardProps {
  file: any;
}

export default function ProcessCard({ file }: ProcessCardProps) {
  // Determinar estado y colores
  const getStatusConfig = () => {
    switch (file.status) {
      case 'uploaded':
        return {
          label: 'En espera',
          color: 'text-amber-500',
          icon: Clock,
          bgColor: 'bg-amber-50'
        };
      case 'processing':
        return {
          label: 'Procesando',
          color: 'text-blue-500',
          icon: File,
          bgColor: 'bg-blue-50'
        };
      case 'completed':
        return {
          label: 'Completado',
          color: 'text-green-500',
          icon: Check,
          bgColor: 'bg-green-50'
        };
      case 'error':
        return {
          label: 'Error',
          color: 'text-red-500',
          icon: AlertTriangle,
          bgColor: 'bg-red-50'
        };
      default:
        return {
          label: 'Pendiente',
          color: 'text-gray-500',
          icon: Clock,
          bgColor: 'bg-gray-50'
        };
    }
  };

  const { label, color, icon: Icon, bgColor } = getStatusConfig();
  const progress = file.progress || 0;

  return (
    <Card className={`overflow-hidden border-l-4 ${color.replace('text', 'border')}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icono del archivo */}
          <div className={`p-2 rounded-full ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          
          {/* Información del archivo */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div className="truncate">
                <h4 className="font-medium truncate">{file.fileName}</h4>
                <p className="text-sm text-gray-500 truncate">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              
              <ProcessStatus status={file.status} label={label} />
            </div>
            
            {/* Barra de progreso */}
            {['processing', 'completed', 'error'].includes(file.status) && (
              <div className="mt-3">
                <Progress value={progress} className="h-2" />
                
                {/* Métricas de procesamiento */}
                {file.status === 'completed' && file.processingTime && (
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <div>Tiempo: {file.processingTime.toFixed(1)}s</div>
                    {file.costo_estimado && (
                      <div>Costo: ${file.costo_estimado.toFixed(5)} USD</div>
                    )}
                  </div>
                )}
                
                {/* Mensaje de error */}
                {file.status === 'error' && file.error && (
                  <p className="mt-2 text-xs text-red-500">
                    {file.error}
                  </p>
                )}
                
                {/* ID del candidato procesado */}
                {file.status === 'completed' && file.candidato_id && (
                  <p className="mt-2 text-xs text-gray-500">
                    ID Candidato: {file.candidato_id}
                    {file.es_actualizacion ? ' (Actualizado)' : ' (Nuevo)'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
