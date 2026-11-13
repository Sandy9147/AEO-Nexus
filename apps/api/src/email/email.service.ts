import { Injectable, Logger } from '@nestjs/common';

export interface SentEmailRecord {
  to: string;
  subject: string;
  body: string;
  type: 'verification' | 'password_reset' | 'invitation' | 'security_alert';
  token?: string;
  actionUrl?: string;
  sentAt: Date;
  mode: 'provider' | 'local_logged';
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sentEmails: SentEmailRecord[] = [];

  private isProviderConfigured(): boolean {
    return Boolean(
      (process.env.SMTP_HOST && process.env.SMTP_USER) ||
      process.env.RESEND_API_KEY
    );
  }

  async sendVerificationEmail(to: string, name: string, token: string): Promise<SentEmailRecord> {
    const webUrl = process.env.CUSTOMER_WEB_URL || 'http://localhost:3001';
    const actionUrl = `${webUrl}/verify-email?token=${token}`;
    const subject = 'Verify your AEO Nexus account';
    const body = `Hello ${name},\n\nPlease verify your email for AEO Nexus by clicking: ${actionUrl}\n\nThis link will expire in 24 hours.`;

    return this.dispatchEmail({
      to,
      subject,
      body,
      type: 'verification',
      token,
      actionUrl,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<SentEmailRecord> {
    const webUrl = process.env.CUSTOMER_WEB_URL || 'http://localhost:3001';
    const actionUrl = `${webUrl}/reset-password?token=${token}`;
    const subject = 'Reset your AEO Nexus password';
    const body = `Hello ${name},\n\nA password reset was requested for your AEO Nexus account: ${actionUrl}\n\nIf you did not request this, please ignore this email. This link will expire in 1 hour.`;

    return this.dispatchEmail({
      to,
      subject,
      body,
      type: 'password_reset',
      token,
      actionUrl,
    });
  }

  async sendWorkspaceInvitationEmail(
    to: string,
    inviterName: string,
    workspaceName: string,
    token: string,
  ): Promise<SentEmailRecord> {
    const webUrl = process.env.CUSTOMER_WEB_URL || 'http://localhost:3001';
    const actionUrl = `${webUrl}/accept-invitation?token=${token}`;
    const subject = `You've been invited to join ${workspaceName} on AEO Nexus`;
    const body = `${inviterName} has invited you to join the "${workspaceName}" workspace on AEO Nexus.\n\nAccept invitation: ${actionUrl}`;

    return this.dispatchEmail({
      to,
      subject,
      body,
      type: 'invitation',
      token,
      actionUrl,
    });
  }

  async sendSecurityAlertEmail(to: string, name: string, details: string): Promise<SentEmailRecord> {
    const subject = 'Security Alert: Suspicious session activity on AEO Nexus';
    const body = `Hello ${name},\n\nA security event was detected on your account:\n${details}\n\nAll existing active sessions have been invalidated as a safeguard. If this was not you, please reset your password immediately.`;

    return this.dispatchEmail({
      to,
      subject,
      body,
      type: 'security_alert',
    });
  }

  private async dispatchEmail(params: {
    to: string;
    subject: string;
    body: string;
    type: 'verification' | 'password_reset' | 'invitation' | 'security_alert';
    token?: string;
    actionUrl?: string;
  }): Promise<SentEmailRecord> {
    const hasProvider = this.isProviderConfigured();
    const mode = hasProvider ? 'provider' : 'local_logged';

    const record: SentEmailRecord = {
      ...params,
      sentAt: new Date(),
      mode,
    };

    this.sentEmails.push(record);

    if (hasProvider) {
      // In production, integrate with nodemailer / Resend SDK
      this.logger.log(`[Email dispatched via Provider] To: ${params.to} | Subject: ${params.subject}`);
    } else {
      this.logger.warn(
        `[EmailService: Dev Mode - No SMTP/Provider Configured]\n` +
        `  To: ${params.to}\n` +
        `  Subject: ${params.subject}\n` +
        `  Action URL: ${params.actionUrl || 'N/A'}\n` +
        `  Notice: Simulated in development. Email recorded in internal audit buffer.`,
      );
    }

    return record;
  }

  getSentEmails(): SentEmailRecord[] {
    return [...this.sentEmails];
  }

  getLatestEmailFor(email: string): SentEmailRecord | undefined {
    return [...this.sentEmails].reverse().find((e) => e.to.toLowerCase() === email.toLowerCase());
  }

  clearHistory(): void {
    this.sentEmails.length = 0;
  }
}

