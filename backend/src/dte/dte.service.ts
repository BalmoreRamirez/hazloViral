import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { DteDetail } from './entities/dte-detail.entity';
import { DteDocument } from './entities/dte-document.entity';

export interface DevelopmentDteInput {
  receiptId: number;
  receiptNumber: string;
  transactionId: string;
  contractId: number;
  amountCop: number;
  influencerName: string;
  influencerEmail: string;
}

export interface DevelopmentDteResult {
  numeroControl: string;
  codigoGeneracion: string;
  pdfUrl: string;
}

@Injectable()
export class DteService implements OnModuleInit {
  private readonly logger = new Logger(DteService.name);
  private readonly dtePdfDir = join(process.cwd(), 'uploads', 'dte');

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(DteDocument)
    private readonly documentsRepo: Repository<DteDocument>,
    @InjectRepository(DteDetail)
    private readonly detailsRepo: Repository<DteDetail>,
  ) {}

  isDevelopmentMode(): boolean {
    return this.config.get<string>('DTE_MODE', 'development').toLowerCase() === 'development';
  }

  async onModuleInit(): Promise<void> {
    if (!this.isDevelopmentMode()) return;
    const documents = await this.documentsRepo.find();
    for (const document of documents) {
      await this.ensureDevelopmentPdf(document);
    }
    if (documents.length) {
      this.logger.log(`PDFs DTE de desarrollo actualizados: ${documents.length}`);
    }
  }

  async ensureDevelopmentPdf(document: DteDocument): Promise<string> {
    if (!this.isDevelopmentMode()) {
      return document.pdf_url ?? '';
    }
    const source = document.json_original as {
      receptor?: { nombre?: string; correo?: string };
      contrato?: number;
      referenciaPago?: string;
    };
    const pdfUrl = this.createDevelopmentPdf({
      numeroControl: document.numero_control,
      codigoGeneracion: document.codigo_generacion,
      date: document.fecha_emision,
      time: document.hora_emision,
      amountCop: Number(document.total_pagar),
      influencerName: source.receptor?.nombre ?? 'Receptor',
      influencerEmail: source.receptor?.correo ?? '',
      contractId: source.contrato ?? 0,
      transactionId: source.referenciaPago ?? '',
    });
    document.pdf_url = pdfUrl;
    await this.documentsRepo.save(document);
    return pdfUrl;
  }

  async createDevelopmentPayoutDte(input: DevelopmentDteInput): Promise<DevelopmentDteResult | null> {
    if (!this.isDevelopmentMode()) {
      throw new Error('La emisión fiscal oficial requiere configurar el firmador y Hacienda.');
    }

    const existing = await this.documentsRepo.findOne({
      where: { payment_receipt_id: input.receiptId },
    });
    if (existing) {
      await this.ensureDevelopmentPdf(existing);
      return {
        numeroControl: existing.numero_control,
        codigoGeneracion: existing.codigo_generacion,
        pdfUrl: existing.pdf_url!,
      };
    }

    const codigoGeneracion = randomUUID();
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toISOString().slice(11, 19);
    const numeroControl = `DTE-DEV-${now.getTime()}-${input.receiptId}`;
    const jsonOriginal = {
      ambiente: '00',
      tipoDte: '03',
      codigoGeneracion,
      numeroControl,
      fecha: date,
      hora: time,
      emisor: { nombre: 'InfluSmart', modo: 'desarrollo' },
      receptor: { nombre: input.influencerName, correo: input.influencerEmail },
      cuerpoDocumento: [{
        numItem: 1,
        descripcion: `Pago de contrato #${input.contractId}`,
        cantidad: 1,
        precioUni: input.amountCop,
        ventaGravada: input.amountCop,
      }],
      totalPagar: input.amountCop,
      referenciaPago: input.transactionId,
      comprobante: input.receiptNumber,
    };

    const pdfUrl = this.createDevelopmentPdf({
      numeroControl,
      codigoGeneracion,
      date,
      time,
      amountCop: input.amountCop,
      influencerName: input.influencerName,
      influencerEmail: input.influencerEmail,
      contractId: input.contractId,
      transactionId: input.transactionId,
    });
    const document = await this.documentsRepo.save(this.documentsRepo.create({
      tipo_dte: '03',
      codigo_generacion: codigoGeneracion,
      numero_control: numeroControl,
      ambiente: '00',
      fecha_emision: date,
      hora_emision: time,
      estado: 'BORRADOR',
      total_gravada: input.amountCop,
      subtotal: input.amountCop,
      total_pagar: input.amountCop,
      total_letras: `${input.amountCop.toFixed(2)} COP`,
      json_original: jsonOriginal,
      payment_receipt_id: input.receiptId,
      pdf_url: pdfUrl,
    }));

    await this.detailsRepo.save(this.detailsRepo.create({
      dte_id: document.id,
      num_item: 1,
      descripcion: `Pago de contrato #${input.contractId}`,
      cantidad: 1,
      precio_unitario: input.amountCop,
      venta_gravada: input.amountCop,
    }));

    this.logger.log(`DTE de desarrollo generado ${numeroControl} para comprobante ${input.receiptNumber}`);
    return { numeroControl, codigoGeneracion, pdfUrl };
  }

  private createDevelopmentPdf(input: {
    numeroControl: string;
    codigoGeneracion: string;
    date: string;
    time: string;
    amountCop: number;
    influencerName: string;
    influencerEmail: string;
    contractId: number;
    transactionId: string;
  }): string {
    if (!existsSync(this.dtePdfDir)) mkdirSync(this.dtePdfDir, { recursive: true });
    const filename = `${input.numeroControl}.pdf`;
    const path = join(this.dtePdfDir, filename);
    writeFileSync(path, this.buildInvoicePdf(input));
    return `/api/uploads/dte/${filename}`;
  }

  private buildInvoicePdf(input: {
    numeroControl: string;
    codigoGeneracion: string;
    date: string;
    time: string;
    amountCop: number;
    influencerName: string;
    influencerEmail: string;
    contractId: number;
    transactionId: string;
  }): Buffer {
    const escape = (value: string) => value
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '?')
      .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const colors = {
      navy: '0.059 0.090 0.165',
      violet: '0.059 0.090 0.165',
      coral: '0.059 0.090 0.165',
      slate: '1 1 1',
      white: '1 1 1',
      ink: '0.059 0.090 0.165',
      muted: '0.059 0.090 0.165',
    };
    const commands: string[] = ['q', '0.8 w', `${colors.navy} RG`];
    const strokeColor = (color: string) => commands.push(`${color} RG`);
    const fillColor = (color: string) => commands.push(`${color} rg`);
    const rect = (x: number, y: number, width: number, height: number, stroke = true, fill?: string) => {
      if (fill) fillColor(fill);
      commands.push(`${x} ${y} ${width} ${height} re ${stroke ? 'B' : 'f'}`);
      if (fill) strokeColor(colors.navy);
    };
    const line = (x1: number, y1: number, x2: number, y2: number) => {
      strokeColor(colors.navy);
      commands.push(`${x1} ${y1} m ${x2} ${y2} l S`);
    };
    const text = (value: string, x: number, y: number, size = 8, bold = false, color = colors.ink) => {
      commands.push(`${color} rg`);
      commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${escape(value)}) Tj ET`);
    };
    const label = (value: string, x: number, y: number) => text(value, x, y, 7, true, colors.navy);
    const value = (name: string, content: string, x: number, y: number) => {
      label(`${name}:`, x, y);
      text(content, x + 82, y, 7);
    };

    rect(20, 20, 572, 802, true, colors.white);
    rect(20, 742, 572, 80, false, colors.navy);
    text('INFLUSMART', 42, 780, 17, true, colors.white);
    text('PLATAFORMA DE MARKETING DE INFLUENCIA', 42, 763, 7, false, colors.slate);
    text('DOCUMENTO TRIBUTARIO ELECTRONICO', 355, 785, 8, true, colors.white);
    text('FACTURA - DESARROLLO', 390, 770, 8, true, colors.slate);
    text('SIN VALIDEZ FISCAL', 425, 752, 7, true, colors.coral);
    line(38, 738, 574, 738);

    label('Codigo de generacion', 42, 714);
    text(input.codigoGeneracion, 140, 714, 6);
    label('Numero de control', 42, 698);
    text(input.numeroControl, 140, 698, 6);
    label('Fecha y hora', 42, 682);
    text(`${input.date} ${input.time}`, 140, 682, 7);
    label('Ambiente', 395, 714);
    text('00 - Desarrollo', 458, 714, 7);
    label('Forma de pago', 395, 698);
    text('Transferencia', 458, 698, 7);
    label('Transaccion', 395, 682);
    text(input.transactionId.slice(0, 20), 458, 682, 6);

    rect(38, 560, 258, 98, true, colors.slate);
    rect(308, 560, 266, 98, true, colors.slate);
    text('EMISOR', 142, 642, 8, true, colors.violet);
    text('RECEPTOR', 420, 642, 8, true, colors.violet);
    value('Nombre o razon social', 'InfluSmart', 48, 622);
    value('NIT', 'N/A (desarrollo)', 48, 606);
    value('Actividad economica', 'Marketing digital', 48, 590);
    value('Establecimiento', 'Casa matriz', 48, 574);
    value('Nombre', input.influencerName.slice(0, 35), 318, 622);
    value('Correo', input.influencerEmail.slice(0, 35), 318, 606);
    value('Contrato', `#${input.contractId}`, 318, 590);
    value('Documento', 'No registrado', 318, 574);

    rect(38, 530, 536, 20, true, colors.slate);
    text('DOCUMENTOS RELACIONADOS', 245, 537, 7, true, colors.violet);
    label('Tipo', 50, 537);
    text('Pago de contrato', 80, 537, 7);
    label('Referencia', 330, 537);
    text(`Comprobante ${input.contractId}`, 380, 537, 7);

    rect(38, 415, 536, 98, true, colors.white);
    rect(38, 493, 536, 20, true, colors.violet);
    text('DETALLE DE LA OPERACION', 235, 500, 8, true, colors.white);
    line(75, 415, 75, 493);
    line(125, 415, 125, 493);
    line(365, 415, 365, 493);
    line(455, 415, 455, 493);
    line(514, 415, 514, 493);
    line(38, 475, 574, 475);
    label('No.', 51, 481);
    label('Cantidad', 84, 481);
    label('Descripcion', 200, 481);
    label('Precio unitario', 378, 481);
    label('Impuestos', 464, 481);
    label('Total', 535, 481);
    text('1', 52, 455, 8);
    text('1', 90, 455, 8);
    text(`Pago por contrato #${input.contractId}`, 132, 455, 8);
    text(input.amountCop.toFixed(2), 382, 455, 8);
    text('0.00', 468, 455, 8);
    text(input.amountCop.toFixed(2), 523, 455, 8);

    rect(365, 327, 209, 75, true, colors.slate);
    line(365, 383, 574, 383);
    line(365, 365, 574, 365);
    line(365, 347, 574, 347);
    label('Subtotal', 390, 388);
    text(`COP ${input.amountCop.toFixed(2)}`, 492, 388, 8);
    label('Impuestos', 390, 370);
    text('COP 0.00', 492, 370, 8);
    label('Total a pagar', 390, 352);
    text(`COP ${input.amountCop.toFixed(2)}`, 492, 352, 8, true, colors.violet);
    label('Estado', 390, 334);
    text('BORRADOR', 492, 334, 8, true, colors.coral);

    rect(38, 275, 536, 34, true, colors.slate);
    value('Valores en letras', `${input.amountCop.toFixed(2)} COP`, 50, 292);
    value('Condicion', 'Contado', 350, 292);
    value('Observaciones', 'Documento simulado para pruebas', 50, 278);

    rect(38, 230, 536, 28, true, colors.coral);
    text('Este documento fue generado en ambiente de desarrollo y no tiene validez fiscal.', 65, 240, 8, true, colors.white);
    text('Consulte el comprobante en la plataforma InfluSmart.', 155, 218, 7, false, colors.muted);
    commands.push('Q');
    const stream = commands.join('\n');
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets[index + 1] = Buffer.byteLength(pdf, 'utf8');
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n');
    pdf += `\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(pdf, 'utf8');
  }
}
