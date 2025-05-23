import fs from 'fs';
import path from 'path';
import { EmailOptions, EmailResult, EmailProvider, EmailTemplate } from '../types/email.types';
import { SMTPEmailService } from './smtp.service';
import { AzureEmailService } from './azure-email.service';

export class EmailService {
  private providers: EmailProvider[] = [];
  private templatesCache: Map<string, string> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Inicializar proveedores según configuración disponible
    const smtpService = new SMTPEmailService();
    const azureService = new AzureEmailService();

    // Determinar orden de preferencia según ENV
    const preferredProvider = process.env.EMAIL_PROVIDER?.toLowerCase();
    
    if (preferredProvider === 'azure' && azureService.isConfigured()) {
      this.providers.push(azureService);
      if (smtpService.isConfigured()) {
        this.providers.push(smtpService);
      }
    } else if (preferredProvider === 'smtp' && smtpService.isConfigured()) {
      this.providers.push(smtpService);
      if (azureService.isConfigured()) {
        this.providers.push(azureService);
      }
    } else {
      // Auto-detectar mejor opción disponible
      if (smtpService.isConfigured()) {
        this.providers.push(smtpService);
      }
      if (azureService.isConfigured()) {
        this.providers.push(azureService);
      }
    }
  }

  /**
   * Envía un email usando el primer proveedor disponible con fallback
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (this.providers.length === 0) {
      return {
        success: false,
        error: 'No hay proveedores de email configurados. Revisa las variables de entorno SMTP_* o AZURE_COMMUNICATION_CONNECTION_STRING.',
        provider: 'none'
      };
    }

    // Validaciones básicas
    if (!options.to || options.to.length === 0) {
      return {
        success: false,
        error: 'Debe especificar al menos un destinatario',
        provider: 'none'
      };
    }

    // Validar que tenga subject o template (se validará después del procesamiento)
    if (!options.subject && !options.template) {
      return {
        success: false,
        error: 'El asunto es requerido (o usar un template que lo contenga)',
        provider: 'none'
      };
    }

    // Procesar template si se especifica
    let processedOptions = { ...options };
    if (options.template) {
      try {
        const templateResult = await this.processTemplate(options.template, options.variables || {});
        processedOptions.html = templateResult.html;
        if (!processedOptions.subject && templateResult.subject) {
          processedOptions.subject = templateResult.subject;
        }
      } catch (error) {
        return {
          success: false,
          error: `Error procesando template: ${error}`,
          provider: 'none'
        };
      }
    }

    // Validar que finalmente tengamos un subject
    if (!processedOptions.subject) {
      return {
        success: false,
        error: 'El asunto es requerido',
        provider: 'none'
      };
    }

    // Intentar enviar con cada proveedor
    for (const provider of this.providers) {
      try {
        const result = await provider.sendEmail(processedOptions);
        if (result.success) {
          return result;
        }
        console.warn(`Proveedor ${provider.getName()} falló:`, result.error);
      } catch (error) {
        console.warn(`Error con proveedor ${provider.getName()}:`, error);
      }
    }

    return {
      success: false,
      error: 'Todos los proveedores de email fallaron',
      provider: 'none'
    };
  }

  /**
   * Procesa un template de email
   */
  private async processTemplate(templateName: string, variables: Record<string, any>) {
    const templatePath = path.join(process.cwd(), 'email', 'templates', `${templateName}.html`);
    
    let templateContent: string;
    
    // Usar cache si está disponible
    if (this.templatesCache.has(templateName)) {
      templateContent = this.templatesCache.get(templateName)!;
    } else {
      // Cargar template desde archivo
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template '${templateName}' no encontrado en ${templatePath}`);
      }
      
      templateContent = fs.readFileSync(templatePath, 'utf-8');
      this.templatesCache.set(templateName, templateContent);
    }

    // Reemplazar variables en el template
    let processedHtml = templateContent;
    let extractedSubject = '';

    // Extraer subject del template si existe (<!-- SUBJECT: Mi Asunto -->)
    const subjectMatch = templateContent.match(/<!--\s*SUBJECT:\s*(.+?)\s*-->/i);
    if (subjectMatch) {
      extractedSubject = subjectMatch[1].trim();
      // Procesar variables en el subject también
      extractedSubject = this.replaceVariables(extractedSubject, variables);
    }

    // Reemplazar variables en el HTML
    processedHtml = this.replaceVariables(processedHtml, variables);

    return {
      html: processedHtml,
      subject: extractedSubject
    };
  }

  /**
   * Reemplaza variables en un string usando formato {{variable}}
   */
  private replaceVariables(content: string, variables: Record<string, any>): string {
    return content.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const trimmedName = variableName.trim();
      return variables[trimmedName] !== undefined ? String(variables[trimmedName]) : match;
    });
  }

  /**
   * Obtiene la lista de templates disponibles
   */
  async getAvailableTemplates(): Promise<EmailTemplate[]> {
    const templatesDir = path.join(process.cwd(), 'email', 'templates');
    
    if (!fs.existsSync(templatesDir)) {
      return [];
    }

    const files = fs.readdirSync(templatesDir).filter(file => file.endsWith('.html'));
    const templates: EmailTemplate[] = [];

    for (const file of files) {
      const templateName = file.replace('.html', '');
      const templatePath = path.join(templatesDir, file);
      const content = fs.readFileSync(templatePath, 'utf-8');
      
      // Extraer subject
      const subjectMatch = content.match(/<!--\s*SUBJECT:\s*(.+?)\s*-->/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : '';
      
      // Extraer variables
      const variableMatches = content.matchAll(/\{\{([^}]+)\}\}/g);
      const variables = Array.from(new Set(
        Array.from(variableMatches).map(match => match[1].trim())
      ));

      templates.push({
        name: templateName,
        subject,
        html: content,
        variables
      });
    }

    return templates;
  }

  /**
   * Envía un email de recuperación de contraseña
   */
  async sendPasswordRecovery(email: string, resetToken: string, userName?: string): Promise<EmailResult> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to: [email],
      template: 'recovery-password',
      variables: {
        userName: userName || 'Usuario',
        resetLink,
        frontendUrl,
        validHours: '24'
      }
    });
  }

  /**
   * Envía un email de bienvenida
   */
  async sendWelcomeEmail(email: string, userName: string, temporaryPassword?: string): Promise<EmailResult> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    return this.sendEmail({
      to: [email],
      template: 'welcome-user',
      variables: {
        userName,
        email,
        temporaryPassword: temporaryPassword || '',
        loginUrl: `${frontendUrl}/auth`,
        frontendUrl
      }
    });
  }

  /**
   * Envía notificación de cambio de contraseña
   */
  async sendPasswordChangedNotification(email: string, userName: string): Promise<EmailResult> {
    return this.sendEmail({
      to: [email],
      template: 'password-changed',
      variables: {
        userName,
        email,
        changeTime: new Date().toLocaleString('es-ES'),
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
      }
    });
  }

  /**
   * Verifica si el servicio de email está configurado
   */
  isConfigured(): boolean {
    return this.providers.length > 0;
  }

  /**
   * Obtiene información sobre los proveedores configurados
   */
  getProviderInfo(): { name: string; configured: boolean }[] {
    const smtpService = new SMTPEmailService();
    const azureService = new AzureEmailService();
    
    return [
      { name: 'SMTP', configured: smtpService.isConfigured() },
      { name: 'Azure Communication Services', configured: azureService.isConfigured() }
    ];
  }
}

// Instancia singleton
export const emailService = new EmailService();