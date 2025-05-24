'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth-context';
import { useTheme } from './theme-context';
import { THEME_PALETTES, ThemeColors, PaletteOption, getThemeColors, getAvailablePalettes } from '@/lib/theme-palettes';

interface CorporateThemeContextType {
  currentPalette: string;
  isDarkMode: boolean;
  colors: ThemeColors;
  availablePalettes: PaletteOption[];
  changePalette: (paletteKey: string) => Promise<void>;
  toggleDarkMode: () => void;
  isLoading: boolean;
}

const CorporateThemeContext = createContext<CorporateThemeContextType | null>(null);

interface CorporateThemeProviderProps {
  children: ReactNode;
}

export function CorporateThemeProvider({ children }: CorporateThemeProviderProps) {
  const { user, currentOrganization } = useAuth();
  const { theme, setTheme } = useTheme();
  const [currentPalette, setCurrentPalette] = useState('corporate_blue');
  const [isLoading, setIsLoading] = useState(true);

  // Calcular isDarkMode basado en el tema principal
  const isDarkMode = theme === 'dark' || (theme === 'system' && 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Cargar tema de la organización cuando cambie
  useEffect(() => {
    if (currentOrganization?.id) {
      loadOrganizationTheme();
    } else {
      setIsLoading(false);
    }
  }, [currentOrganization?.id]);

  // Aplicar CSS variables cuando cambie el tema
  useEffect(() => {
    applyThemeToDOM();
  }, [currentPalette, isDarkMode, theme]);

  // Listener para cambios en preferencias del sistema
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        applyThemeToDOM();
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const loadOrganizationTheme = async () => {
    if (!currentOrganization?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/organizations/${currentOrganization.id}/theme`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setCurrentPalette(result.data.palette_key || 'corporate_blue');
        }
      }
    } catch (error) {
      console.error('Error loading organization theme:', error);
      // Usar tema por defecto si hay error
      setCurrentPalette('corporate_blue');
    } finally {
      setIsLoading(false);
    }
  };

  const changePalette = async (paletteKey: string) => {
    if (!currentOrganization?.id) {
      console.error('No organization selected');
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}/theme`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          palette_key: paletteKey 
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCurrentPalette(paletteKey);
        } else {
          console.error('Error changing palette:', result.error);
        }
      } else {
        console.error('HTTP error changing palette:', response.status);
      }
    } catch (error) {
      console.error('Network error changing palette:', error);
    }
  };

  const toggleDarkMode = () => {
    // Usar el sistema de temas principal en lugar del corporativo
    if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  // Función para convertir hex a oklch (simplificada para el ejemplo)
  const hexToOklch = (hex: string): string => {
    // Quitar el # si existe
    hex = hex.replace('#', '');
    
    // Convertir hex a RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Conversión simplificada a OKLCH (para colores básicos)
    // En producción se recomienda usar una librería como culori
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    // Mapeo aproximado a valores OKLCH
    if (luminance > 0.9) return `oklch(${(luminance * 0.9 + 0.1).toFixed(3)} 0 0)`;
    if (luminance < 0.1) return `oklch(${(luminance * 0.5 + 0.1).toFixed(3)} 0 0)`;
    
    // Para colores con saturación
    const chroma = Math.sqrt((r - g) ** 2 + (g - b) ** 2 + (b - r) ** 2) * 0.3;
    let hue = 0;
    
    if (chroma > 0.01) {
      // Calcular hue aproximado
      if (r >= g && r >= b) hue = ((g - b) / chroma) * 60;
      else if (g >= r && g >= b) hue = ((b - r) / chroma + 2) * 60;
      else hue = ((r - g) / chroma + 4) * 60;
      
      if (hue < 0) hue += 360;
    }
    
    return `oklch(${luminance.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)})`;
  };

  const applyThemeToDOM = () => {
    const colors = getThemeColors(currentPalette, isDarkMode);
    
    const root = document.documentElement;
    
    // Aplicar variables corporativas (tanto hex como oklch)
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--corporate-${key}`, value);
      // También convertir a OKLCH para compatibilidad con Tailwind
      const oklchValue = hexToOklch(value);
      root.style.setProperty(`--corporate-${key}-oklch`, oklchValue);
    });

    // Aplicar la clase corporate-theme para sobrescribir las variables de shadcn
    root.classList.add('corporate-theme');

    // Aplicar clase de modo oscuro corporativo (sin interferir con las clases de Tailwind)
    if (isDarkMode) {
      root.classList.add('corporate-dark');
    } else {
      root.classList.remove('corporate-dark');
    }
  };

  const getCurrentColors = (): ThemeColors => {
    return getThemeColors(currentPalette, isDarkMode);
  };

  const contextValue: CorporateThemeContextType = {
    currentPalette,
    isDarkMode,
    colors: getCurrentColors(),
    availablePalettes: getAvailablePalettes(),
    changePalette,
    toggleDarkMode,
    isLoading
  };

  return (
    <CorporateThemeContext.Provider value={contextValue}>
      {children}
    </CorporateThemeContext.Provider>
  );
}

export const useCorporateTheme = (): CorporateThemeContextType => {
  const context = useContext(CorporateThemeContext);
  if (!context) {
    throw new Error('useCorporateTheme must be used within a CorporateThemeProvider');
  }
  return context;
};