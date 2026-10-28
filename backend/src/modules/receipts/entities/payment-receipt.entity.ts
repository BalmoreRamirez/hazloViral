import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompanyProfile } from '../../companies/entities/company-profile.entity';
import { InfluencerProfile } from '../../influencers/entities/influencer-profile.entity';
import { EscrowContract } from '../../contracts/entities/escrow-contract.entity';
import { ElectronicInvoice } from '../../electronic-invoicing/entities/electronic-invoice.entity';

export type PaymentReceiptType =
  | 'credits_top_up'
  | 'escrow_funding'
  | 'platform_commission'
  | 'influencer_payout';

@Entity('payment_receipts')
@Index('uq_payment_receipts_operation', ['operation_type', 'operation_reference'], { unique: true })
@Index('idx_payment_receipts_empresa', ['empresa_id', 'created_at'])
@Index('idx_payment_receipts_influencer', ['influencer_id', 'created_at'])
@Check(
  'chk_payment_receipt_operation_owner',
  "(operation_type = 'credits_top_up' AND empresa_id IS NOT NULL AND influencer_id IS NULL AND contrato_id IS NULL) OR (operation_type IN ('escrow_funding', 'platform_commission', 'influencer_payout') AND empresa_id IS NOT NULL AND influencer_id IS NOT NULL AND contrato_id IS NOT NULL)",
)
@Check('chk_payment_receipt_amount_nonnegative', 'amount_usd >= 0')
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

  @ManyToOne(() => CompanyProfile, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: CompanyProfile | null;

  @ManyToOne(() => InfluencerProfile, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'influencer_id' })
  influencer: InfluencerProfile | null;

  @ManyToOne(() => EscrowContract, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'contrato_id', referencedColumnName: 'id' },
    { name: 'empresa_id', referencedColumnName: 'empresa_id' },
    { name: 'influencer_id', referencedColumnName: 'influencer_id' },
  ])
  contrato: EscrowContract | null;

  @OneToOne(() => ElectronicInvoice, (invoice) => invoice.payment_receipt)
  electronic_invoice: ElectronicInvoice | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount_usd: number;

  @Column({ length: 3, default: 'USD' })
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
