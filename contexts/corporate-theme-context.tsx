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

  // Función para convertir hex a oklch con valores conocidos
  const hexToOklch = (hex: string): string => {
    // Quitar el # si existe
    hex = hex.replace('#', '').toLowerCase();
    
    // Mapeo directo para colores conocidos del tema corporativo
    const knownColors: Record<string, string> = {
      // Azul corporativo - primary
      '2563eb': 'oklch(0.570 0.191 263.89)', // blue-600
      '3b82f6': 'oklch(0.642 0.185 264.35)', // blue-500
      // Azul corporativo - accent  
      '0ea5e9': 'oklch(0.694 0.154 199.77)', // sky-500
      '38bdf8': 'oklch(0.758 0.131 205.08)', // sky-400
      '497fef': 'oklch(0.640 0.180 263.89)', // blue-500 variant
      // Otros azules comunes
      '1e40af': 'oklch(0.435 0.166 263.89)', // blue-800
      '60a5fa': 'oklch(0.703 0.142 264.35)', // blue-400
      '93c5fd': 'oklch(0.786 0.108 264.35)', // blue-300
      // Grises y neutros
      'ffffff': 'oklch(1 0 0)',
      '000000': 'oklch(0 0 0)',
      'f8fafc': 'oklch(0.985 0 0)',
      '1e293b': 'oklch(0.205 0 0)',
      '64748b': 'oklch(0.556 0 0)',
      '94a3b8': 'oklch(0.708 0 0)',
      'f1f5f9': 'oklch(0.985 0 0)',
      'e2e8f0': 'oklch(0.922 0 0)',
      '334155': 'oklch(0.269 0 0)',
      '0f172a': 'oklch(0.145 0 0)',
      // Verdes para success
      '10b981': 'oklch(0.708 0.170 162.48)',
      '22c55e': 'oklch(0.756 0.181 142.50)',
      '0284c7': 'oklch(0.590 0.154 199.77)', // sky-600 para success azul
      // Otros colores
      'f59e0b': 'oklch(0.768 0.189 84.429)', // amber-500
      'fbbf24': 'oklch(0.828 0.189 84.429)', // amber-400
      'ef4444': 'oklch(0.627 0.265 27.325)', // red-500
      'f87171': 'oklch(0.704 0.191 22.216)', // red-400
      'dc2626': 'oklch(0.577 0.245 27.325)', // red-600
    };
    
    // Si tenemos el color mapeado, usarlo directamente
    if (knownColors[hex]) {
      return knownColors[hex];
    }
    
    // Conversión fallback mejorada para colores no mapeados
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Conversión RGB a Lab aproximada
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    // Para grises (baja saturación)
    if (Math.abs(r - g) < 0.1 && Math.abs(g - b) < 0.1 && Math.abs(b - r) < 0.1) {
      return `oklch(${luminance.toFixed(3)} 0 0)`;
    }
    
    // Estimación simple de chroma y hue
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = (max - min) * 0.15; // Reducir chroma para valores más conservadores
    
    let hue = 0;
    if (chroma > 0.01) {
      if (max === r) {
        hue = ((g - b) / (max - min)) * 60;
      } else if (max === g) {
        hue = ((b - r) / (max - min) + 2) * 60;
      } else {
        hue = ((r - g) / (max - min) + 4) * 60;
      }
      
      if (hue < 0) hue += 360;
    }
    
    return `oklch(${luminance.toFixed(3)} ${Math.min(chroma, 0.2).toFixed(3)} ${hue.toFixed(1)})`;
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