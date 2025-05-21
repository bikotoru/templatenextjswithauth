'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MainTabs from './components/main-tabs';
import FileUploader from './components/file-uploader';
import ProcessList from './components/process-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CVManagerPage() {
  const [activeTab, setActiveTab] = useState('upload');
  const [processQueue, setProcessQueue] = useState<any[]>([]);

  const handleFilesUploaded = (files: any[]) => {
    setProcessQueue((prev) => [...prev, ...files]);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Sistema de Gestión de RRHH</h1>
      
      <MainTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="mt-6">
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cargar y Procesar CVs</CardTitle>
                <CardDescription>
                  Sube archivos PDF de currículums para procesarlos con IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploader onFilesUploaded={handleFilesUploaded} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>CVs en Procesamiento</CardTitle>
                <CardDescription>
                  Se pueden procesar hasta 3 CVs en paralelo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProcessList processQueue={processQueue} setProcessQueue={setProcessQueue} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
