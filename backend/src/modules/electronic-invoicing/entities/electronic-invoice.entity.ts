import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentReceipt } from '../../receipts/entities/payment-receipt.entity';
import { InvoiceDetail } from './invoice-detail.entity';

export type ElectronicInvoiceType = '01' | '03' | '05' | '06' | '14';
export type ElectronicInvoiceStatus =
  | 'BORRADOR'
  | 'FIRMADO'
  | 'TRANSMITIDO'
  | 'RECHAZADO'
  | 'CONTINGENCIA'
  | 'ANULADO';

@Entity('dte_documents')
@Index('uq_dte_codigo_generacion', ['codigo_generacion'], { unique: true })
@Index('uq_dte_numero_control', ['numero_control'], { unique: true })
export class ElectronicInvoice {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 2 })
  tipo_dte: ElectronicInvoiceType;

  @Column({ type: 'uuid' })
  codigo_generacion: string;

  @Column({ type: 'varchar', length: 31 })
  numero_control: string;

  @Column({ type: 'varchar', length: 2, default: '00' })
  ambiente: '00' | '01';

  @Column({ type: 'smallint', default: 1 })
  tipo_modelo: number;

  @Column({ type: 'smallint', default: 1 })
  tipo_operacion: number;

  @Column({ type: 'date' })
  fecha_emision: string;

  @Column({ type: 'time' })
  hora_emision: string;

  @Column({ type: 'varchar', length: 20, default: 'BORRADOR' })
  estado: ElectronicInvoiceStatus;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_gravada: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_exenta: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_no_sujeta: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  monto_iva: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_pagar: number;

  @Column({ type: 'varchar', length: 200 })
  total_letras: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  sello_recibido: string | null;

  @Column({ type: 'jsonb' })
  json_original: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  json_firmado: string | null;

  @Column({ type: 'jsonb', nullable: true })
  respuesta_mh: Record<string, unknown> | null;

  @Column({ type: 'int', nullable: true })
  payment_receipt_id: number | null;

  @OneToOne(() => PaymentReceipt, (receipt) => receipt.electronic_invoice, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'payment_receipt_id' })
  payment_receipt: PaymentReceipt | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pdf_url: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => InvoiceDetail, (detail) => detail.dte)
  details: InvoiceDetail[];
}
