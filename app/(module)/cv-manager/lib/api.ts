// Funciones para interactuar con las APIs

// Función para subir un archivo a Azure Blob Storage
export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/cv-manager/api', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Error uploading file: ${response.statusText}`);
  }

  return await response.json();
}

// Función para procesar un CV subido a Azure
export async function processCV(blobUrl: string) {
  const response = await fetch('/cv-manager/api/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ blobUrl }),
  });

  if (!response.ok) {
    throw new Error(`Error processing CV: ${response.statusText}`);
  }

  return await response.json();
}

// Función para obtener el estado de procesamiento de un CV
export async function getProcessingStatus(candidateId: number) {
  const response = await fetch(`/cv-manager/api/process?candidateId=${candidateId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error checking processing status: ${response.statusText}`);
  }

  return await response.json();
}

// Función para obtener métricas de procesamiento
export async function getProcessingMetrics() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  
  try {
    const response = await fetch(`${apiUrl}/costs/procesamiento`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching metrics: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching processing metrics:', error);
    throw error;
  }
}
