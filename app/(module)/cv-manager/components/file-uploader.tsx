'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface FileUploaderProps {
  onFilesUploaded: (files: any[]) => void;
}

export default function FileUploader({ onFilesUploaded }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);

  // Función para subir un archivo a Azure Blob Storage
  const uploadFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/cv-manager/api', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error uploading file: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        originalFile: file,
        ...data,
        status: 'uploaded',
      };
    } catch (error: any) {
      console.error('File upload error:', error);
      return {
        originalFile: file,
        fileName: file.name,
        error: error.message,
        status: 'error',
      };
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Validar los archivos
    const invalidFiles = acceptedFiles.filter(file => 
      file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')
    );

    if (invalidFiles.length > 0) {
      setErrorMessage('Solo se aceptan archivos PDF');
      return;
    }

    // Tomar hasta 3 archivos a la vez
    const filesToUpload = acceptedFiles.slice(0, 3);
    setUploadingFiles(filesToUpload);
    setUploading(true);
    setErrorMessage(null);

    try {
      // Subir los archivos a Azure Blob Storage
      const uploadPromises = filesToUpload.map(file => uploadFile(file));
      const uploadedFiles = await Promise.all(uploadPromises);

      // Notificar al componente padre sobre los archivos subidos
      onFilesUploaded(uploadedFiles);
    } catch (error: any) {
      console.error('Error uploading files:', error);
      setErrorMessage(`Error al subir archivos: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadingFiles([]);
    }
  }, [onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    disabled: uploading,
    maxFiles: 3
  });

  return (
    <div className="space-y-4">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 text-center hover:bg-gray-50 transition cursor-pointer ${
          isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          
          <div>
            {isDragActive ? (
              <p className="text-sm font-medium">Suelta los archivos aquí</p>
            ) : (
              <>
                <p className="text-sm font-medium">
                  Arrastra y suelta CVs aquí, o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Solo archivos PDF (máximo 3 a la vez)
                </p>
              </>
            )}
          </div>
          
          <Button type="button" disabled={uploading}>
            Seleccionar archivos
          </Button>
        </div>
      </div>

      {uploading && uploadingFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Subiendo archivos:</h3>
          <ul className="space-y-2">
            {uploadingFiles.map((file, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <File className="h-4 w-4" />
                {file.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
