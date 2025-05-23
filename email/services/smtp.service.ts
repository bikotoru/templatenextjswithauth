import nodemailer from 'nodemailer';
import { EmailProvider, EmailOptions, EmailResult, SMTPConfig } from '../types/email.types';

export class SMTPEmailService implements EmailProvider {
  private transporter: nodemailer.Transporter | null = null;
  private config: SMTPConfig | null = null;

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig() {
    // Verificar si tenemos todas las variables necesarias
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM_EMAIL;
    const fromName = process.env.SMTP_FROM_NAME;

    if (host && port && user && pass && fromEmail) {
      this.config = {
        host,
        port: parseInt(port),
        secure: process.env.SMTP_SECURE === 'true' || parseInt(port) === 465,
        user,
        pass,
        fromEmail,
        fromName: fromName || 'Sistema'
      };

      // Crear transporter
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass
        },
        // Configuraciones adicionales para mejor compatibilidad
        pool: true, // Usar connection pooling
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 20000, // 20 segundos
        rateLimit: 5, // 5 emails por rateDelta
      });

      // Verificar conexión al inicializar (opcional)
      if (process.env.NODE_ENV !== 'production') {
        this.verifyConnection();
      }
    }
  }

  private async verifyConnection() {
    if (!this.transporter) return;
    
    try {
      await this.transporter.verify();
      console.log('✅ SMTP Server configurado correctamente');
    } catch (error) {
      console.warn('⚠️  Error verificando conexión SMTP:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.transporter || !this.config) {
      return {
        success: false,
        error: 'SMTP no está configurado correctamente',
        provider: 'smtp'
      };
    }

    try {
      // Preparar destinatarios
      const to = options.to.join(', ');
      const cc = options.cc?.join(', ');
      const bcc = options.bcc?.join(', ');

      // Preparar adjuntos para nodemailer
      const attachments = options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
        encoding: att.encoding as any,
        cid: att.cid
      }));

      // Configurar el email
      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to,
        cc,
        bcc,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments
      };

      // Enviar email
      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        provider: 'smtp'
      };

    } catch (error: any) {
      console.error('Error enviando email via SMTP:', error);
      
      return {
        success: false,
        error: `SMTP Error: ${error.message || 'Error desconocido'}`,
        provider: 'smtp'
      };
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }

  getName(): string {
    return 'SMTP';
  }

  /**
   * Cierra las conexiones del pool
   */
  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
    }
  }

  /**
   * Obtiene información sobre la configuración
   */
  getConfigInfo(): Partial<SMTPConfig> | null {
    if (!this.config) return null;
    
    return {
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      fromEmail: this.config.fromEmail,
      fromName: this.config.fromName,
      // No exponer credenciales
      user: this.config.user.replace(/(.{2}).*(@.*)/, '$1***$2')
    };
  }
}