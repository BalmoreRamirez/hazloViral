import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type PaymentReceiptType =
  | 'credits_top_up'
  | 'escrow_funding'
  | 'platform_commission'
  | 'influencer_payout';

@Entity('payment_receipts')
@Index('uq_payment_receipts_operation', ['operation_type', 'operation_reference'], { unique: true })
@Index('idx_payment_receipts_empresa', ['empresa_id', 'created_at'])
@Index('idx_payment_receipts_influencer', ['influencer_id', 'created_at'])
export class PaymentReceipt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 40 })
  receipt_number: string;

  @Column({ length: 40 })
  operation_type: PaymentReceiptType;

  @Column({ length: 120 })
  operation_reference: string;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  wompi_transaction_id: string | null;

  @Column({ type: 'int', nullable: true })
  empresa_id: number | null;

  @Column({ type: 'int', nullable: true })
  influencer_id: number | null;

  @Column({ type: 'int', nullable: true })
  contrato_id: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount_usd: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount_cop: number;

  @Column({ length: 3, default: 'COP' })
  currency: string;

  @Column({ type: 'jsonb' })
  issuer_snapshot: Record<string, string | null>;

  @Column({ type: 'jsonb' })
  customer_snapshot: Record<string, string | null>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ default: false })
  is_fiscal_dte: boolean;

  @Column({ default: false })
  factura_enviada: boolean;

  @CreateDateColumn()
  created_at: Date;
}
