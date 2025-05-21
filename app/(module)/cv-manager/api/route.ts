import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

// Función auxiliar para configurar el cliente de Azure Blob Storage
function getBlobServiceClient() {
  const account = process.env.AZURE_STORAGE_ACCOUNT || '';
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'public';
  
  if (!account || !accountKey) {
    throw new Error('Azure Storage credentials not configured');
  }
  
  const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
  const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    sharedKeyCredential
  );
  
  return { blobServiceClient, containerName };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Generar un GUID único para el nombre del archivo
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    
    // Obtener el cliente de blob storage
    const { blobServiceClient, containerName } = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Crear el cliente para el blob
    const blockBlobClient = containerClient.getBlockBlobClient(uniqueFileName);
    
    // Convertir el archivo a un buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Subir el archivo
    await blockBlobClient.upload(buffer, buffer.length);
    
    // Obtener la URL del blob
    const blobUrl = blockBlobClient.url;
    
    return NextResponse.json({
      success: true,
      fileName: file.name,
      uniqueFileName,
      blobUrl,
      size: file.size,
      type: file.type
    });
    
  } catch (error: any) {
    console.error('Error uploading file to Azure Blob Storage:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
