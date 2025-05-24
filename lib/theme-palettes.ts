// Definición de paletas de colores corporativos
export interface ThemeColors {
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
}

export interface ThemePalette {
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
}

export interface PaletteOption {
  key: string;
  name: string;
  colors: ThemePalette;
}

export const THEME_PALETTES: Record<string, ThemePalette> = {
  // Paleta 1: Azul Corporativo (Defaul)
  corporate_blue: {
    name: "Azul Corporativo",
    light: {
      primary: "#2563eb",      // Azul principal
      secondary: "#64748b",    // Gris azulado
      accent: "#0ea5e9",       // Azul claro
      background: "#ffffff",   // Fondo blanco
      surface: "#f8fafc",      // Superficie gris muy claro
      text: "#1e293b",         // Texto oscuro
      textSecondary: "#64748b", // Texto secundario
      border: "#e2e8f0",       // Bordes
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#3b82f6",      // Azul más claro
      secondary: "#94a3b8",    // Gris más claro
      accent: "#38bdf8",       // Azul cyan
      background: "#0f172a",   // Fondo muy oscuro
      surface: "#1e293b",      // Superficie oscura
      text: "#f1f5f9",         // Texto claro
      textSecondary: "#94a3b8", // Texto secundario
      border: "#334155",       // Bordes oscuros
      success: "#22c55e",      // Verde más claro
      warning: "#fbbf24",      // Amarillo más claro
      error: "#f87171",        // Rojo más claro
    }
  },

  // Paleta 2: Verde Empresarial
  business_green: {
    name: "Verde Empresarial",
    light: {
      primary: "#16a34a",      // Verde principal
      secondary: "#6b7280",    // Gris neutro
      accent: "#22c55e",       // Verde claro
      background: "#ffffff",   // Fondo blanco
      surface: "#f9fafb",      // Superficie gris muy claro
      text: "#111827",         // Texto oscuro
      textSecondary: "#6b7280", // Texto secundario
      border: "#d1d5db",       // Bordes
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#22c55e",      // Verde más claro
      secondary: "#9ca3af",    // Gris más claro
      accent: "#4ade80",       // Verde cyan
      background: "#111827",   // Fondo muy oscuro
      surface: "#1f2937",      // Superficie oscura
      text: "#f9fafb",         // Texto claro
      textSecondary: "#9ca3af", // Texto secundario
      border: "#374151",       // Bordes oscuros
      success: "#34d399",      // Verde más claro
      warning: "#fbbf24",      // Amarillo más claro
      error: "#f87171",        // Rojo más claro
    }
  },

  // Paleta 3: Púrpura Moderno
  modern_purple: {
    name: "Púrpura Moderno",
    light: {
      primary: "#7c3aed",      // Púrpura principal
      secondary: "#64748b",    // Gris azulado
      accent: "#a855f7",       // Púrpura claro
      background: "#ffffff",   // Fondo blanco
      surface: "#faf7ff",      // Superficie púrpura muy claro
      text: "#1e1b24",         // Texto oscuro
      textSecondary: "#64748b", // Texto secundario
      border: "#e9e3ff",       // Bordes púrpura claro
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#a855f7",      // Púrpura más claro
      secondary: "#94a3b8",    // Gris más claro
      accent: "#c084fc",       // Púrpura cyan
      background: "#0f0b1a",   // Fondo muy oscuro púrpura
      surface: "#1a1625",      // Superficie oscura púrpura
      text: "#f8fafc",         // Texto claro
      textSecondary: "#94a3b8", // Texto secundario
      border: "#2d2438",       // Bordes oscuros púrpura
      success: "#22c55e",      // Verde más claro
      warning: "#fbbf24",      // Amarillo más claro
      error: "#f87171",        // Rojo más claro
    }
  },

  // Paleta 4: Naranja Vibrante
  vibrant_orange: {
    name: "Naranja Vibrante",
    light: {
      primary: "#ea580c",      // Naranja principal
      secondary: "#6b7280",    // Gris neutro
      accent: "#fb923c",       // Naranja claro
      background: "#ffffff",   // Fondo blanco
      surface: "#fffbf7",      // Superficie naranja muy claro
      text: "#1c1917",         // Texto oscuro
      textSecondary: "#6b7280", // Texto secundario
      border: "#fed7aa",       // Bordes naranja claro
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#fb923c",      // Naranja más claro
      secondary: "#9ca3af",    // Gris más claro
      accent: "#fdba74",       // Naranja cyan
      background: "#1a0f0a",   // Fondo muy oscuro naranja
      surface: "#2c1810",      // Superficie oscura naranja
      text: "#fef7f0",         // Texto claro
      textSecondary: "#9ca3af", // Texto secundario
      border: "#44281a",       // Bordes oscuros naranja
      success: "#22c55e",      // Verde más claro
      warning: "#fbbf24",      // Amarillo más claro
      error: "#f87171",        // Rojo más claro
    }
  }
};

// Función helper para obtener colores actuales
export function getThemeColors(paletteKey: string, isDarkMode: boolean): ThemeColors {
  const palette = THEME_PALETTES[paletteKey] || THEME_PALETTES.corporate_blue;
  return isDarkMode ? palette.dark : palette.light;
}

// Función helper para obtener lista de paletas disponibles
export function getAvailablePalettes(): PaletteOption[] {
  return Object.entries(THEME_PALETTES).map(([key, palette]) => ({
    key,
    name: palette.name,
    colors: palette
  }));
}