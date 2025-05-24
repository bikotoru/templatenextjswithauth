'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth-context';
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
  const [currentPalette, setCurrentPalette] = useState('corporate_blue');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [currentPalette, isDarkMode]);

  // Cargar preferencia de modo oscuro desde localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('corporateDarkMode');
    if (savedDarkMode) {
      setIsDarkMode(JSON.parse(savedDarkMode));
    }
    if (!currentOrganization?.id) {
      setIsLoading(false);
    }
  }, []);

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
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('corporateDarkMode', JSON.stringify(newDarkMode));
  };

  const applyThemeToDOM = () => {
    const colors = getThemeColors(currentPalette, isDarkMode);
    
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--corporate-${key}`, value);
    });

    // También aplicar clase de modo oscuro corporativo
    if (isDarkMode) {
      document.documentElement.classList.add('corporate-dark');
    } else {
      document.documentElement.classList.remove('corporate-dark');
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