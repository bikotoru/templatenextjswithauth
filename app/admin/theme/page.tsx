'use client';

import { CorporateThemeSelector } from '@/components/corporate-theme-selector';

export default function ThemePage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Configuración de Tema</h1>
        <p className="text-muted-foreground">
          Personaliza los colores corporativos y el tema visual de tu organización.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selector de Tema */}
        <div className="space-y-4">
          <CorporateThemeSelector />
        </div>

        {/* Preview en vivo */}
        <div className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Vista Previa</h3>
            
            {/* Ejemplos de componentes con tema */}
            <div className="space-y-4">
              {/* Botones */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Botones</h4>
                <div className="flex space-x-2">
                  <button className="corporate-bg-primary px-4 py-2 rounded-md text-white">
                    Primario
                  </button>
                  <button className="corporate-bg-secondary px-4 py-2 rounded-md text-white">
                    Secundario
                  </button>
                  <button className="corporate-bg-accent px-4 py-2 rounded-md text-white">
                    Acento
                  </button>
                </div>
              </div>

              {/* Textos */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Textos</h4>
                <div className="space-y-1">
                  <p className="corporate-text-main font-semibold">Texto Principal</p>
                  <p className="corporate-text-secondary-color">Texto Secundario</p>
                  <p className="corporate-text-primary">Texto con Color Primario</p>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Tarjetas</h4>
                <div className="corporate-bg-surface corporate-border-default border rounded-lg p-4">
                  <h5 className="corporate-text-main font-medium">Tarjeta de Ejemplo</h5>
                  <p className="corporate-text-secondary-color text-sm mt-1">
                    Esta es una tarjeta con los colores corporativos aplicados.
                  </p>
                  <div className="mt-3 flex space-x-2">
                    <span className="corporate-bg-success text-white text-xs px-2 py-1 rounded">
                      Éxito
                    </span>
                    <span className="corporate-bg-warning text-white text-xs px-2 py-1 rounded">
                      Advertencia
                    </span>
                    <span className="corporate-bg-error text-white text-xs px-2 py-1 rounded">
                      Error
                    </span>
                  </div>
                </div>
              </div>

              {/* Bordes y elementos */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Elementos</h4>
                <div className="space-y-2">
                  <div className="corporate-border-primary border-l-4 pl-3">
                    <p className="corporate-text-main text-sm">Borde primario</p>
                  </div>
                  <div className="corporate-border-default border rounded p-3">
                    <p className="corporate-text-main text-sm">Borde por defecto</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="border rounded-lg p-6 bg-muted/30">
        <h3 className="text-lg font-semibold mb-3">Información del Sistema de Temas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-muted-foreground mb-2">Características:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Paletas predefinidas profesionales</li>
              <li>• Soporte completo para modo oscuro</li>
              <li>• Aplicación automática en toda la interfaz</li>
              <li>• Configuración por organización</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-muted-foreground mb-2">Uso para Desarrolladores:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Clases CSS: <code>corporate-bg-primary</code></li>
              <li>• Variables CSS: <code>var(--corporate-primary)</code></li>
              <li>• Context: <code>useCorporateTheme()</code></li>
              <li>• Transiciones suaves automáticas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}