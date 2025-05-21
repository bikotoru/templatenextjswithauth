'use client';

import { useState, useEffect } from 'react';
import ProcessCard from './process-card';

interface ProcessListProps {
  processQueue: any[];
  setProcessQueue: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function ProcessList({ processQueue, setProcessQueue }: ProcessListProps) {
  const [activeProcesses, setActiveProcesses] = useState<any[]>([]);
  const [waitingProcesses, setWaitingProcesses] = useState<any[]>([]);
  const [completedProcesses, setCompletedProcesses] = useState<any[]>([]);

  useEffect(() => {
    // Actualizar colas de procesos
    const active = processQueue.filter(item => item.status === 'processing');
    const waiting = processQueue.filter(item => item.status === 'uploaded' || !item.status);
    const completed = processQueue.filter(item => 
      ['completed', 'error'].includes(item.status)
    );

    setActiveProcesses(active);
    setWaitingProcesses(waiting);
    setCompletedProcesses(completed);

    // Iniciar procesamiento de archivos en espera si hay espacio
    if (active.length < 3 && waiting.length > 0) {
      const availableSlots = 3 - active.length;
      const toProcess = waiting.slice(0, availableSlots);
      
      // Mover archivos a procesar
      const newQueue = [...processQueue];
      toProcess.forEach(file => {
        const index = newQueue.findIndex(item => 
          item.uniqueFileName === file.uniqueFileName
        );
        
        if (index !== -1) {
          newQueue[index] = { ...newQueue[index], status: 'processing' };
          // Iniciar el procesamiento de este archivo
          processCV(newQueue[index], index, newQueue);
        }
      });
      
      setProcessQueue(newQueue);
    }
  }, [processQueue, setProcessQueue]);

  // Función para procesar un CV
  const processCV = async (file: any, index: number, currentQueue: any[]) => {
    try {
      // Marcar como procesando
      const updatedFile = { ...file, status: 'processing', progress: 0 };
      const newQueue = [...currentQueue];
      newQueue[index] = updatedFile;
      setProcessQueue(newQueue);
      
      // Llamar a la API para procesar el CV
      const startTime = new Date();
      const response = await fetch('/cv-manager/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobUrl: file.blobUrl
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error processing CV: ${response.statusText}`);
      }
      
      // Simular progreso
      const simulateProgress = (time: number, idx: number) => {
        setTimeout(() => {
          setProcessQueue(prev => {
            const updated = [...prev];
            const fileIndex = updated.findIndex(f => f.uniqueFileName === file.uniqueFileName);
            if (fileIndex !== -1 && updated[fileIndex].status === 'processing') {
              updated[fileIndex] = { 
                ...updated[fileIndex], 
                progress: Math.min(95, 10 + idx * 20) 
              };
            }
            return updated;
          });
        }, time);
      };
      
      // Simular diferentes etapas de progreso
      for (let i = 1; i <= 5; i++) {
        simulateProgress(i * 1000, i);
      }
      
      // Procesar respuesta
      const result = await response.json();
      const endTime = new Date();
      const processingTime = (endTime.getTime() - startTime.getTime()) / 1000; // en segundos
      
      // Actualizar con el resultado
      setTimeout(() => {
        setProcessQueue(prev => {
          const updated = [...prev];
          const fileIndex = updated.findIndex(f => f.uniqueFileName === file.uniqueFileName);
          
          if (fileIndex !== -1) {
            updated[fileIndex] = { 
              ...updated[fileIndex], 
              ...result,
              status: result.success ? 'completed' : 'error',
              progress: 100,
              processingTime
            };
          }
          
          return updated;
        });
      }, 6000); // Terminar después de la simulación
      
    } catch (error: any) {
      console.error('Error processing CV:', error);
      
      // Actualizar con error
      setProcessQueue(prev => {
        const updated = [...prev];
        const fileIndex = updated.findIndex(f => f.uniqueFileName === file.uniqueFileName);
        
        if (fileIndex !== -1) {
          updated[fileIndex] = { 
            ...updated[fileIndex], 
            status: 'error',
            error: error.message,
            progress: 100
          };
        }
        
        return updated;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sección de procesamiento activo */}
      {activeProcesses.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">Procesando ({activeProcesses.length}/3)</h3>
          <div className="space-y-3">
            {activeProcesses.map((file) => (
              <ProcessCard key={file.uniqueFileName} file={file} />
            ))}
          </div>
        </div>
      )}
      
      {/* Sección de archivos en espera */}
      {waitingProcesses.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">En espera ({waitingProcesses.length})</h3>
          <div className="space-y-3">
            {waitingProcesses.map((file) => (
              <ProcessCard key={file.uniqueFileName} file={file} />
            ))}
          </div>
        </div>
      )}
      
      {/* Sección de archivos completados */}
      {completedProcesses.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">Completados ({completedProcesses.length})</h3>
          <div className="space-y-3">
            {completedProcesses.map((file) => (
              <ProcessCard key={file.uniqueFileName} file={file} />
            ))}
          </div>
        </div>
      )}
      
      {/* Mensaje cuando no hay archivos */}
      {processQueue.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No hay CVs en procesamiento</p>
          <p className="text-sm">Sube archivos para comenzar</p>
        </div>
      )}
    </div>
  );
}
