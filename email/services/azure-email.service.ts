import { EmailClient, EmailMessage } from '@azure/communication-email';
import { EmailProvider, EmailOptions, EmailResult, AzureEmailConfig } from '../types/email.types';

export class AzureEmailService implements EmailProvider {
  private client: EmailClient | null = null;
  private config: AzureEmailConfig | null = null;

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig() {
    const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
    const fromEmail = process.env.AZURE_FROM_EMAIL || process.env.SMTP_FROM_EMAIL;
    const fromName = process.env.AZURE_FROM_NAME || process.env.SMTP_FROM_NAME;

    if (connectionString && fromEmail) {
      this.config = {
        connectionString,
        fromEmail,
        fromName: fromName || 'Sistema'
      };

      try {
        this.client = new EmailClient(connectionString);
        console.log('✅ Azure Communication Services configurado correctamente');
      } catch (error) {
        console.warn('⚠️  Error inicializando Azure Email Client:', error);
        this.client = null;
        this.config = null;
      }
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.client || !this.config) {
      return {
        success: false,
        error: 'Azure Communication Services no está configurado correctamente',
        provider: 'azure'
      };
    }

    try {
      // Preparar destinatarios
      const toRecipients = options.to.map(email => ({ address: email }));
      const ccRecipients = options.cc?.map(email => ({ address: email })) || [];
      const bccRecipients = options.bcc?.map(email => ({ address: email })) || [];

      // Preparar adjuntos para Azure
      const attachments = options.attachments?.map(att => ({
        name: att.filename,
        contentType: att.contentType || 'application/octet-stream',
        contentInBase64: Buffer.isBuffer(att.content) 
          ? att.content.toString('base64')
          : Buffer.from(att.content).toString('base64')
      }));

      // Configurar el mensaje
      const emailMessage: EmailMessage = {
        senderAddress: this.config.fromEmail,
        content: options.html 
          ? {
              subject: options.subject || 'No Subject',
              html: options.html,
              ...(options.text ? { plainText: options.text } : {})
            }
          : {
              subject: options.subject || 'No Subject',
              plainText: options.text || '' // Ensure plainText is always a string
            },
        recipients: {
          to: toRecipients,
          cc: ccRecipients.length > 0 ? ccRecipients : undefined,
          bcc: bccRecipients.length > 0 ? bccRecipients : undefined
        },
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
        replyTo: options.replyTo ? [{ address: options.replyTo }] : undefined
      };

      // Enviar email
      const poller = await this.client.beginSend(emailMessage);
      const result = await poller.pollUntilDone();

      if (result.status === 'Succeeded') {
        return {
          success: true,
          messageId: result.id,
          provider: 'azure'
        };
      } else {
        return {
          success: false,
          error: `Azure Email failed with status: ${result.status}`,
          provider: 'azure'
        };
      }

    } catch (error: any) {
      console.error('Error enviando email via Azure:', error);
      
      return {
        success: false,
        error: `Azure Error: ${error.message || 'Error desconocido'}`,
        provider: 'azure'
      };
    }
  }

  isConfigured(): boolean {
    return this.client !== null && this.config !== null;
  }

  getName(): string {
    return 'Azure Communication Services';
  }

  /**
   * Obtiene información sobre la configuración (sin exponer datos sensibles)
   */
  getConfigInfo(): Partial<AzureEmailConfig> | null {
    if (!this.config) return null;
    
    return {
      fromEmail: this.config.fromEmail,
      fromName: this.config.fromName,
      // No exponer connection string completo
      connectionString: this.config.connectionString.substring(0, 50) + '...'
    };
  }

  /**
   * Verifica el estado del servicio
   */
  async checkStatus(): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Cliente no configurado' };
    }

    try {
      // Intentar una operación simple para verificar conectividad
      // Azure Communication Services no tiene un método específico de health check
      // pero podemos verificar que el cliente esté inicializado correctamente
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}