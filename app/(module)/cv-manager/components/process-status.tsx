'use client';

import { Badge } from "@/components/ui/badge";

interface ProcessStatusProps {
  status: string;
  label: string;
}

export default function ProcessStatus({ status, label }: ProcessStatusProps) {
  // Configurar el color del badge según el estado
  const getVariant = () => {
    switch (status) {
      case 'uploaded':
        return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
      case 'processing':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
      case 'completed':
        return 'bg-green-100 text-green-700 hover:bg-green-100';
      case 'error':
        return 'bg-red-100 text-red-700 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
    }
  };

  return (
    <Badge className={`${getVariant()} font-normal`} variant="secondary">
      {label}
    </Badge>
  );
}
