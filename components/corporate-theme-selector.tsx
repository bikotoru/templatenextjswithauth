'use client';

import { useState } from 'react';
import { useCorporateTheme } from '@/contexts/corporate-theme-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Moon, Sun, Palette, Check } from 'lucide-react';

export function CorporateThemeSelector() {
  const { 
    currentPalette, 
    availablePalettes, 
    changePalette, 
    isDarkMode, 
    toggleDarkMode,
    isLoading 
  } = useCorporateTheme();

  const [isChanging, setIsChanging] = useState(false);

  const handlePaletteChange = async (paletteKey: string) => {
    if (isChanging || paletteKey === currentPalette) return;
    
    setIsChanging(true);
    try {
      await changePalette(paletteKey);
    } catch (error) {
      console.error('Error changing palette:', error);
    } finally {
      setIsChanging(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Cargando configuración de tema...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Palette className="h-5 w-5" />
          <span>Tema Corporativo</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle día/noche */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <div>
              <span className="font-medium">Modo de visualización</span>
              <p className="text-sm text-muted-foreground">
                {isDarkMode ? 'Modo oscuro activado' : 'Modo claro activado'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDarkMode}
            className="flex items-center space-x-2"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{isDarkMode ? 'Claro' : 'Oscuro'}</span>
          </Button>
        </div>

        {/* Selector de paletas */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center space-x-2">
            <span>Paleta de Colores Corporativa</span>
            {isChanging && <Loader2 className="h-4 w-4 animate-spin" />}
          </h4>
          
          <div className="grid grid-cols-1 gap-4">
            {availablePalettes.map((palette) => (
              <PaletteOption
                key={palette.key}
                palette={palette}
                isSelected={currentPalette === palette.key}
                onSelect={() => handlePaletteChange(palette.key)}
                isDarkMode={isDarkMode}
                isDisabled={isChanging}
              />
            ))}
          </div>
          
          <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
            <p className="font-medium mb-1">💡 Información:</p>
            <p>Los colores corporativos se aplicarán a toda la interfaz de tu organización. Los cambios se verán reflejados inmediatamente.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PaletteOptionProps {
  palette: {
    key: string;
    name: string;
    colors: {
      light: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
        border: string;
        success: string;
        warning: string;
        error: string;
      };
      dark: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
        border: string;
        success: string;
        warning: string;
        error: string;
      };
    };
  };
  isSelected: boolean;
  onSelect: () => void;
  isDarkMode: boolean;
  isDisabled: boolean;
}

function PaletteOption({ 
  palette, 
  isSelected, 
  onSelect, 
  isDarkMode, 
  isDisabled 
}: PaletteOptionProps) {
  const colors = isDarkMode ? palette.colors.dark : palette.colors.light;

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={`
        w-full p-4 rounded-lg border-2 transition-all text-left
        ${isSelected 
          ? 'border-primary bg-primary/5 shadow-md' 
          : 'border-border hover:border-primary/50 hover:shadow-sm'
        }
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="font-medium">{palette.name}</span>
          {isSelected && (
            <Badge variant="default" className="flex items-center space-x-1">
              <Check className="h-3 w-3" />
              <span>Activo</span>
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {isDarkMode ? '🌙' : '☀️'}
        </div>
      </div>
      
      {/* Preview de colores */}
      <div className="flex space-x-2">
        <div 
          className="w-10 h-10 rounded-md border shadow-sm flex items-center justify-center"
          style={{ backgroundColor: colors.primary }}
          title="Color Primario"
        >
          <span className="text-xs font-bold" style={{ color: colors.background }}>P</span>
        </div>
        <div 
          className="w-10 h-10 rounded-md border shadow-sm flex items-center justify-center"
          style={{ backgroundColor: colors.secondary }}
          title="Color Secundario"
        >
          <span className="text-xs font-bold" style={{ color: colors.background }}>S</span>
        </div>
        <div 
          className="w-10 h-10 rounded-md border shadow-sm flex items-center justify-center"
          style={{ backgroundColor: colors.accent }}
          title="Color de Acento"
        >
          <span className="text-xs font-bold" style={{ color: colors.background }}>A</span>
        </div>
        <div 
          className="w-10 h-10 rounded-md border shadow-sm"
          style={{ backgroundColor: colors.surface }}
          title="Color de Superficie"
        />
        <div className="flex-1 flex items-center">
          <div className="text-xs space-y-1">
            <div className="font-medium" style={{ color: colors.text }}>
              Texto Principal
            </div>
            <div className="text-xs" style={{ color: colors.textSecondary }}>
              Texto Secundario
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-muted-foreground">
        Vista previa en modo {isDarkMode ? 'oscuro' : 'claro'}
      </div>
    </button>
  );
}