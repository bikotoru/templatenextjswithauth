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
  // Tema por defecto de ShadCN (Zinc/Slate)
  shadcn_default: {
    name: "ShadCN Clásico",
    light: {
      primary: "#18181b",      // Negro zinc
      secondary: "#f4f4f5",    // Zinc 100
      accent: "#f4f4f5",       // Zinc 100
      background: "#ffffff",   // Fondo blanco
      surface: "#f4f4f5",      // Zinc 100
      text: "#09090b",         // Zinc 950
      textSecondary: "#71717a", // Zinc 500
      border: "#e4e4e7",       // Zinc 200
      success: "#22c55e",      // Green 500
      warning: "#eab308",      // Yellow 500
      error: "#ef4444",        // Red 500
    },
    dark: {
      primary: "#fafafa",      // Zinc 50
      secondary: "#27272a",    // Zinc 800
      accent: "#27272a",       // Zinc 800
      background: "#09090b",   // Zinc 950
      surface: "#18181b",      // Zinc 900
      text: "#fafafa",         // Zinc 50
      textSecondary: "#a1a1aa", // Zinc 400
      border: "#27272a",       // Zinc 800
      success: "#22c55e",      // Green 500
      warning: "#eab308",      // Yellow 500
      error: "#ef4444",        // Red 500
    }
  },

  // Azul Corporativo
  corporate_blue: {
    name: "Azul Corporativo",
    light: {
      primary: "#2563eb",      // Azul principal
      secondary: "#64748b",    // Gris azulado
      accent: "#497fef",       // Azul claro
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

  // Verde Empresarial
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

  // Púrpura Moderno
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

  // Naranja Vibrante
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
  },

  // Rojo Empresarial
  corporate_red: {
    name: "Rojo Empresarial",
    light: {
      primary: "#dc2626",      // Rojo principal
      secondary: "#6b7280",    // Gris neutro
      accent: "#ef4444",       // Rojo claro
      background: "#ffffff",   // Fondo blanco
      surface: "#fef2f2",      // Superficie rojo muy claro
      text: "#1f2937",         // Texto oscuro
      textSecondary: "#6b7280", // Texto secundario
      border: "#fecaca",       // Bordes rojo claro
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#f87171",      // Rojo más claro
      secondary: "#9ca3af",    // Gris más claro
      accent: "#fca5a5",       // Rojo cyan
      background: "#1a0808",   // Fondo muy oscuro rojo
      surface: "#2d1b1b",      // Superficie oscura rojo
      text: "#fef2f2",         // Texto claro
      textSecondary: "#9ca3af", // Texto secundario
      border: "#44292b",       // Bordes oscuros rojo
      success: "#22c55e",      // Verde más claro
      warning: "#fbbf24",      // Amarillo más claro
      error: "#f87171",        // Rojo más claro
    }
  },

  // Cyan Moderno
  modern_cyan: {
    name: "Cyan Moderno",
    light: {
      primary: "#0891b2",      // Cyan principal
      secondary: "#64748b",    // Gris azulado
      accent: "#06b6d4",       // Cyan claro
      background: "#ffffff",   // Fondo blanco
      surface: "#f0fdff",      // Superficie cyan muy claro
      text: "#0c4a6e",         // Texto azul oscuro
      textSecondary: "#64748b", // Texto secundario
      border: "#a5f3fc",       // Bordes cyan claro
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#22d3ee",      // Cyan más claro
      secondary: "#94a3b8",    // Gris más claro
      accent: "#67e8f9",       // Cyan cyan
      background: "#0a1a1f",   // Fondo muy oscuro cyan
      surface: "#164e63",      // Superficie oscura cyan
      text: "#f0fdff",         // Texto claro
      textSecondary: "#94a3b8", // Texto secundario
      border: "#0e7490",       // Bordes oscuros cyan
      success: "#22c55e",      // Verde más claro
      warning: "#fbbf24",      // Amarillo más claro
      error: "#f87171",        // Rojo más claro
    }
  },

  // Rosa Elegante
  elegant_pink: {
    name: "Rosa Elegante",
    light: {
      primary: "#db2777",      // Rosa principal
      secondary: "#6b7280",    // Gris neutro
      accent: "#f472b6",       // Rosa claro
      background: "#ffffff",   // Fondo blanco
      surface: "#fdf2f8",      // Superficie rosa muy claro
      text: "#1f2937",         // Texto oscuro
      textSecondary: "#6b7280", // Texto secundario
      border: "#f9a8d4",       // Bordes rosa claro
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#f472b6",      // Rosa más claro
      secondary: "#9ca3af",    // Gris más claro
      accent: "#f9a8d4",       // Rosa cyan
      background: "#1a0a12",   // Fondo muy oscuro rosa
      surface: "#2d1b22",      // Superficie oscura rosa
      text: "#fdf2f8",         // Texto claro
      textSecondary: "#9ca3af", // Texto secundario
      border: "#44293b",       // Bordes oscuros rosa
      success: "#22c55e",      // Verde más claro
      warning: "#fbbf24",      // Amarillo más claro
      error: "#f87171",        // Rojo más claro
    }
  },

  // Índigo Profesional
  professional_indigo: {
    name: "Índigo Profesional",
    light: {
      primary: "#4338ca",      // Índigo principal
      secondary: "#64748b",    // Gris azulado
      accent: "#6366f1",       // Índigo claro
      background: "#ffffff",   // Fondo blanco
      surface: "#f8faff",      // Superficie índigo muy claro
      text: "#1e1b3a",         // Texto oscuro
      textSecondary: "#64748b", // Texto secundario
      border: "#e0e7ff",       // Bordes índigo claro
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#818cf8",      // Índigo más claro
      secondary: "#94a3b8",    // Gris más claro
      accent: "#a5b4fc",       // Índigo cyan
      background: "#0f0d1f",   // Fondo muy oscuro índigo
      surface: "#1e1b3a",      // Superficie oscura índigo
      text: "#f8faff",         // Texto claro
      textSecondary: "#94a3b8", // Texto secundario
      border: "#312e81",       // Bordes oscuros índigo
      success: "#22c55e",      // Verde más claro
      warning: "#fbbf24",      // Amarillo más claro
      error: "#f87171",        // Rojo más claro
    }
  },

  // Amarillo Dorado
  golden_yellow: {
    name: "Amarillo Dorado",
    light: {
      primary: "#d97706",      // Amarillo dorado principal
      secondary: "#6b7280",    // Gris neutro
      accent: "#f59e0b",       // Amarillo claro
      background: "#ffffff",   // Fondo blanco
      surface: "#fffbeb",      // Superficie amarillo muy claro
      text: "#1c1917",         // Texto oscuro
      textSecondary: "#6b7280", // Texto secundario
      border: "#fde68a",       // Bordes amarillo claro
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#fbbf24",      // Amarillo más claro
      secondary: "#9ca3af",    // Gris más claro
      accent: "#fcd34d",       // Amarillo cyan
      background: "#1a1408",   // Fondo muy oscuro amarillo
      surface: "#2c1f0a",      // Superficie oscura amarillo
      text: "#fffbeb",         // Texto claro
      textSecondary: "#9ca3af", // Texto secundario
      border: "#44351a",       // Bordes oscuros amarillo
      success: "#22c55e",      // Verde más claro
      warning: "#fbbf24",      // Amarillo más claro
      error: "#f87171",        // Rojo más claro
    }
  },

  // Teal Profesional
  professional_teal: {
    name: "Teal Profesional",
    light: {
      primary: "#0d9488",      // Teal principal
      secondary: "#6b7280",    // Gris neutro
      accent: "#14b8a6",       // Teal claro
      background: "#ffffff",   // Fondo blanco
      surface: "#f0fdfa",      // Superficie teal muy claro
      text: "#134e4a",         // Texto teal oscuro
      textSecondary: "#6b7280", // Texto secundario
      border: "#99f6e4",       // Bordes teal claro
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#2dd4bf",      // Teal más claro
      secondary: "#9ca3af",    // Gris más claro
      accent: "#5eead4",       // Teal cyan
      background: "#0a1f1c",   // Fondo muy oscuro teal
      surface: "#134e4a",      // Superficie oscura teal
      text: "#f0fdfa",         // Texto claro
      textSecondary: "#9ca3af", // Texto secundario
      border: "#0f766e",       // Bordes oscuros teal
      success: "#22c55e",      // Verde más claro
      warning: "#fbbf24",      // Amarillo más claro
      error: "#f87171",        // Rojo más claro
    }
  },

  // Esmeralda Lujo
  luxury_emerald: {
    name: "Esmeralda Lujo",
    light: {
      primary: "#059669",      // Esmeralda principal
      secondary: "#6b7280",    // Gris neutro
      accent: "#10b981",       // Esmeralda claro
      background: "#ffffff",   // Fondo blanco
      surface: "#ecfdf5",      // Superficie esmeralda muy claro
      text: "#064e3b",         // Texto esmeralda oscuro
      textSecondary: "#6b7280", // Texto secundario
      border: "#a7f3d0",       // Bordes esmeralda claro
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#34d399",      // Esmeralda más claro
      secondary: "#9ca3af",    // Gris más claro
      accent: "#6ee7b7",       // Esmeralda cyan
      background: "#0a1f17",   // Fondo muy oscuro esmeralda
      surface: "#064e3b",      // Superficie oscura esmeralda
      text: "#ecfdf5",         // Texto claro
      textSecondary: "#9ca3af", // Texto secundario
      border: "#047857",       // Bordes oscuros esmeralda
      success: "#34d399",      // Verde más claro
      warning: "#fbbf24",      // Amarillo más claro
      error: "#f87171",        // Rojo más claro
    }
  },

  // Gris Minimalista
  minimal_gray: {
    name: "Gris Minimalista",
    light: {
      primary: "#374151",      // Gris principal
      secondary: "#6b7280",    // Gris neutro
      accent: "#4b5563",       // Gris claro
      background: "#ffffff",   // Fondo blanco
      surface: "#f9fafb",      // Superficie gris muy claro
      text: "#111827",         // Texto oscuro
      textSecondary: "#6b7280", // Texto secundario
      border: "#d1d5db",       // Bordes gris claro
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#d1d5db",      // Gris más claro
      secondary: "#9ca3af",    // Gris más claro
      accent: "#e5e7eb",       // Gris cyan
      background: "#111827",   // Fondo muy oscuro gris
      surface: "#1f2937",      // Superficie oscura gris
      text: "#f9fafb",         // Texto claro
      textSecondary: "#9ca3af", // Texto secundario
      border: "#374151",       // Bordes oscuros gris
      success: "#22c55e",      // Verde más claro
      warning: "#fbbf24",      // Amarillo más claro
      error: "#f87171",        // Rojo más claro
    }
  },

  // Violeta Creativo
  creative_violet: {
    name: "Violeta Creativo",
    light: {
      primary: "#8b5cf6",      // Violeta principal
      secondary: "#64748b",    // Gris azulado
      accent: "#a78bfa",       // Violeta claro
      background: "#ffffff",   // Fondo blanco
      surface: "#faf5ff",      // Superficie violeta muy claro
      text: "#1e1b3a",         // Texto oscuro
      textSecondary: "#64748b", // Texto secundario
      border: "#ddd6fe",       // Bordes violeta claro
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#c4b5fd",      // Violeta más claro
      secondary: "#94a3b8",    // Gris más claro
      accent: "#ddd6fe",       // Violeta cyan
      background: "#0f0b1f",   // Fondo muy oscuro violeta
      surface: "#1e1b3a",      // Superficie oscura violeta
      text: "#faf5ff",         // Texto claro
      textSecondary: "#94a3b8", // Texto secundario
      border: "#5b21b6",       // Bordes oscuros violeta
      success: "#22c55e",      // Verde más claro
      warning: "#fbbf24",      // Amarillo más claro
      error: "#f87171",        // Rojo más claro
    }
  },

  // Azul Marino Ejecutivo
  executive_navy: {
    name: "Azul Marino Ejecutivo",
    light: {
      primary: "#1e3a8a",      // Azul marino principal
      secondary: "#64748b",    // Gris azulado
      accent: "#3b82f6",       // Azul claro
      background: "#ffffff",   // Fondo blanco
      surface: "#f8fafc",      // Superficie azul muy claro
      text: "#1e293b",         // Texto oscuro
      textSecondary: "#64748b", // Texto secundario
      border: "#dbeafe",       // Bordes azul claro
      success: "#10b981",      // Verde éxito
      warning: "#f59e0b",      // Amarillo advertencia
      error: "#ef4444",        // Rojo error
    },
    dark: {
      primary: "#60a5fa",      // Azul más claro
      secondary: "#94a3b8",    // Gris más claro
      accent: "#93c5fd",       // Azul cyan
      background: "#0c1426",   // Fondo muy oscuro azul
      surface: "#1e293b",      // Superficie oscura azul
      text: "#f8fafc",         // Texto claro
      textSecondary: "#94a3b8", // Texto secundario
      border: "#1e40af",       // Bordes oscuros azul
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