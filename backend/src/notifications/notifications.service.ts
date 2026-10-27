import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;
  private readonly smtpUser: string | undefined;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = config.get<number>('SMTP_PORT', 587);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.smtpUser = user;

    // Gmail exige que el from coincida con la cuenta autenticada.
    // Si SMTP_FROM es un dominio propio (no gmail.com), se usa el user como remitente real.
    const configuredFrom = config.get<string>('SMTP_FROM');
    this.fromAddress = configuredFrom ?? user ?? 'no-reply@influsmart.com';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });
      this.logger.log(`SMTP configurado: ${host}:${port} (usuario: ${user})`);
    } else {
      this.logger.warn(
        'SMTP no configurado (SMTP_HOST/SMTP_USER/SMTP_PASS ausentes). ' +
          'Los emails se imprimirán en consola.',
      );
    }
  }

  /** Verifica la conexión SMTP. Lanza error si falla. Solo usar en dev/diagnóstico. */
  async testConnection(): Promise<string> {
    if (!this.transporter) return 'SMTP no configurado';
    await this.transporter.verify();
    return `Conexión SMTP OK — usuario: ${this.smtpUser}`;
  }

  async sendEmailVerification(opts: {
    email: string;
    verifyUrl: string;
  }): Promise<void> {
    const { email, verifyUrl } = opts;
    const subject = 'Verifica tu correo — InfluSmart';
    const html = `
      <p>Hola,</p>
      <p>Gracias por registrarte en <strong>InfluSmart</strong>. Solo un paso más:</p>
      <p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
          Verificar mi correo
        </a>
      </p>
      <p>Este enlace expira en <strong>24 horas</strong>.</p>
      <p style="color:#888;font-size:12px;">
        Si no creaste esta cuenta, ignora este mensaje.<br>
        Si el botón no funciona: ${verifyUrl}
      </p>
    `;

    if (!this.transporter) {
      this.logger.warn(`[EMAIL NO ENVIADO — SMTP no configurado] Para: ${email}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"InfluSmart" <${this.smtpUser}>`,
        to: email,
        subject,
        html,
      });
      this.logger.log(`Email de verificación enviado a ${email}`);
    } catch (err: any) {
      this.logger.error(`Error al enviar email de verificación a ${email}: ${err?.message}`);
      throw err;
    }
  }

  async sendPasswordReset(opts: {
    email: string;
    resetUrl: string;
  }): Promise<void> {
    const { email, resetUrl } = opts;
    const subject = 'Recupera tu contraseña — InfluSmart';
    const html = `
      <p>Hola,</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>InfluSmart</strong>.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
          Restablecer contraseña
        </a>
      </p>
      <p>Este enlace expira en <strong>1 hora</strong>.</p>
      <p>Si no solicitaste este cambio, ignora este mensaje. Tu contraseña seguirá siendo la misma.</p>
      <p style="color:#888;font-size:12px;">
        Si el botón no funciona, copia y pega este enlace en tu navegador:<br>${resetUrl}
      </p>
    `;

    if (!this.transporter) {
      this.logger.warn(
        `[EMAIL NO ENVIADO — SMTP no configurado]\nPara: ${email}\nAsunto: ${subject}\nURL: ${resetUrl}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"InfluSmart" <${this.smtpUser}>`,
        to: email,
        subject,
        html,
      });
      this.logger.log(`Email de recuperación enviado a ${email}`);
    } catch (err: any) {
      this.logger.error(`Error al enviar email de recuperación a ${email}: ${err?.message}`);
      throw err; // relanzar para que forgotPassword lo capture en dev
    }
  }

  async sendTutorConfirmation(opts: {
    tutorEmail: string;
    tutorNombre: string;
    influencerNombre: string;
    influencerEmail: string;
  }): Promise<void> {
    const { tutorEmail, tutorNombre, influencerNombre, influencerEmail } = opts;

    const subject = `Autorización de registro en InfluSmart — ${influencerNombre}`;
    const html = `
      <p>Estimado/a <strong>${tutorNombre}</strong>,</p>
      <p>
        Le informamos que el/la menor de edad <strong>${influencerNombre}</strong>
        (<a href="mailto:${influencerEmail}">${influencerEmail}</a>) ha sido registrado/a
        en la plataforma <strong>InfluSmart</strong> como influencer.
      </p>
      <p>
        Al completar el registro, usted confirmó bajo declaración jurada actuar como
        representante legal y autorizar la participación del/la menor en la plataforma.
      </p>
      <p>
        Cualquier contrato o acuerdo económico generado por esta cuenta estará vinculado
        a su representación legal. Para consultas, escríbanos a
        <a href="mailto:soporte@influsmart.com">soporte@influsmart.com</a>.
      </p>
      <p style="color:#888;font-size:12px;">
        Si usted no autorizó este registro, contáctenos de inmediato.
      </p>
    `;

    if (!this.transporter) {
      this.logger.warn(
        `[EMAIL NO ENVIADO — SMTP no configurado]\n` +
          `Para: ${tutorEmail}\nAsunto: ${subject}\n` +
          `Influencer: ${influencerNombre} (${influencerEmail})`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"InfluSmart" <${this.smtpUser}>`,
        to:   tutorEmail,
        subject,
        html,
      });
      this.logger.log(
        `Email de confirmación de tutor enviado a ${tutorEmail} para ${influencerNombre}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Error al enviar email al tutor ${tutorEmail}: ${err?.message}`,
      );
    }
  }

  async sendCreditsTopUpReceipt(opts: {
    email: string; companyName: string; receiptNumber: string; amountUsd: number;
    pdfPath: string; documentNumber: string; subtotal: number; iva: number;
  }): Promise<boolean> {
    if (!this.transporter || !opts.email) return false;
    const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
    try {
      const result = await this.transporter.sendMail({
        from: `"InfluSmart" <${this.smtpUser}>`, to: opts.email,
        subject: `Factura de recarga — ${opts.receiptNumber} — InfluSmart`,
        html: `<p>Hola ${escape(opts.companyName)},</p><p>Tu recarga de <strong>$${opts.amountUsd.toFixed(2)} USD</strong> fue registrada.</p>
          <p>Base: $${opts.subtotal.toFixed(2)} · IVA incluido: $${opts.iva.toFixed(2)} · Total: $${opts.amountUsd.toFixed(2)} USD.</p>
          <p>Adjuntamos el documento ${escape(opts.documentNumber)}. Es un documento simulado de desarrollo, sin validez fiscal.</p>`,
        attachments: [{ filename: `${opts.documentNumber}.pdf`, path: opts.pdfPath }],
      });
      return !!result.accepted?.length && !result.rejected?.length;
    } catch (error: any) {
      this.logger.error(`No se pudo enviar la factura de recarga ${opts.receiptNumber}: ${error?.code ?? 'SMTP_ERROR'}`);
      return false;
    }
  }

  async sendInfluencerPayoutReceipt(opts: {
    email: string;
    influencerName: string;
    receiptNumber: string;
    amountUsd: number;
    transactionId: string;
    contractId: number;
    isFiscalDte: boolean;
    developmentDteNumber?: string;
    developmentDtePdfPath?: string;
  }): Promise<boolean> {
    const {
      email,
      influencerName,
      receiptNumber,
      amountUsd,
      transactionId,
      contractId,
      isFiscalDte,
      developmentDteNumber,
      developmentDtePdfPath,
    } = opts;
    const subject = `Comprobante de pago del contrato #${contractId} — InfluSmart`;
    const fiscalNote = isFiscalDte
      ? 'Este documento corresponde a una factura electrónica autorizada.'
      : 'Este documento es un comprobante interno y no sustituye una factura electrónica fiscal.';
    const html = `
      <p>Hola <strong>${influencerName}</strong>,</p>
      <p>Se confirmó el pago correspondiente al contrato <strong>#${contractId}</strong>.</p>
      <p>
        <strong>Comprobante:</strong> ${receiptNumber}<br>
        <strong>Monto:</strong> $${amountUsd.toFixed(2)} USD<br>
        <strong>Transacción:</strong> ${transactionId}
      </p>
      <p>${fiscalNote}</p>
      ${developmentDteNumber ? `<p><strong>DTE de desarrollo:</strong> ${developmentDteNumber}</p>` : ''}
      <p style="color:#888;font-size:12px;">
        Puedes consultar el comprobante en la sección Pagos de tu cuenta de InfluSmart.
      </p>
    `;

    if (!this.transporter) {
      this.logger.warn(`[EMAIL NO ENVIADO — SMTP no configurado] Para: ${email} Asunto: ${subject}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: `"InfluSmart" <${this.smtpUser}>`,
        to: email,
        subject,
        html,
        ...(developmentDtePdfPath ? {
          attachments: [{ filename: `${developmentDteNumber ?? 'dte'}.pdf`, path: developmentDtePdfPath }],
        } : {}),
      });
      this.logger.log(`Comprobante de payout enviado a ${email} para contrato ${contractId}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Error al enviar comprobante de payout a ${email}: ${err?.message}`);
      return false;
    }
  }
}
