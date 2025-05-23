export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
  cid?: string; // Para imágenes embebidas
}

export interface EmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string; // Opcional cuando se usa template
  template?: string;
  html?: string;
  text?: string;
  variables?: Record<string, any>;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'smtp' | 'azure' | 'none';
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<EmailResult>;
  isConfigured(): boolean;
  getName(): string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface AzureEmailConfig {
  connectionString: string;
  fromEmail: string;
  fromName?: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  variables: string[]; // Lista de variables que acepta el template
}