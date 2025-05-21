// Funciones de utilidad para el módulo de gestión de CVs

import { format, formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';

// Formatear tamaño de archivo a formato legible
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// Formatear fecha
export function formatDate(date: string | Date): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: es });
}

// Calcular tiempo transcurrido desde una fecha
export function timeAgo(date: string | Date): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { 
    addSuffix: true,
    locale: es
  });
}

// Truncar texto si es muy largo
export function truncateText(text: string, maxLength: number = 50): string {
  if (!text) return '';
  
  return text.length > maxLength
    ? `${text.substring(0, maxLength)}...`
    : text;
}

// Validar extensión de archivo
export function isValidFileType(file: File, validTypes: string[] = ['application/pdf']): boolean {
  return validTypes.includes(file.type) || 
         (file.name.toLowerCase().endsWith('.pdf') && validTypes.includes('application/pdf'));
}

// Generar un color según un texto (para avatares, etc.)
export function stringToColor(str: string): string {
  if (!str) return '#6d28d9'; // Color por defecto
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
}
