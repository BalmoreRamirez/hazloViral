import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ContractStatus } from '../../../common/enums';
import { Chat } from '../../chats/entities/chat.entity';
import { CompanyProfile } from '../../companies/entities/company-profile.entity';
import { InfluencerProfile } from '../../influencers/entities/influencer-profile.entity';
import type { EntregableConArchivos, PublicationLink } from '../../../common/types';

export interface BriefSnapshot {
  titulo_campana: string;
  objetivo_principal: string | null;
  tono_de_voz: string | null;
  puntos_clave_si: string | null;
  restricciones_no: string | null;
  recursos_esteticos: string | null;
  // Campos añadidos en el brief extendido — null en contratos anteriores
  presupuesto_min?: number | null;
  presupuesto_max?: number | null;
  publico_objetivo?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  plataformas?: string[] | null;
  formatos?: string | null;
  hashtags_menciones?: string | null;
  derechos_uso?: string | null;
  exclusividad_dias?: number | null;
  exclusividad_detalle?: string | null;
  requiere_disclosure?: boolean | null;
  archivos?: { url: string; nombre: string; tipo_archivo: string; size_bytes: number }[] | null;
}

@Entity('contratos_escrow')
@Index('idx_contratos_status', ['status'])
@Check('chk_contract_amount_nonnegative', 'monto_total >= 0 AND comision_plataforma >= 0')
@Unique('uq_contract_id_parties', ['id', 'empresa_id', 'influencer_id'])
export class EscrowContract {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  chat_id: number;

  @Column()
  empresa_id: number;

  @Column()
  influencer_id: number;

  @ManyToOne(() => Chat, (chat) => chat.contratos, { onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'chat_id', referencedColumnName: 'id' },
    { name: 'empresa_id', referencedColumnName: 'empresa_id' },
    { name: 'influencer_id', referencedColumnName: 'influencer_id' },
  ])
  chat: Chat;

  @ManyToOne(() => CompanyProfile, (empresa) => empresa.contratos, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: CompanyProfile;

  @ManyToOne(() => InfluencerProfile, (influencer) => influencer.contratos, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'influencer_id' })
  influencer: InfluencerProfile;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto_total: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  comision_plataforma: number;

  @Column({ nullable: true, length: 500 })
  contrato_pdf_url: string;

  @Column({ type: 'jsonb' })
  entregables: EntregableConArchivos[];

  @Column({ type: 'date' })
  fecha_limite_entrega: string;

  @Column({ type: 'int', default: 0 })
  revision_round: number;

  @Column({ type: 'jsonb', nullable: true })
  publication_links: PublicationLink[];

  @Column({ type: 'text', nullable: true })
  motivo_incumplimiento: string;

  @Column({ type: 'text', nullable: true })
  resolucion_admin: string;

  @Column({ default: false })
  resuelto_por_admin: boolean;

  // Brief de la campaña vigente al aceptar la propuesta. Se guarda una copia porque
  // el brief original puede editarse o eliminarse después.
  @Column({ type: 'int', nullable: true })
  campaign_brief_id: number | null;

  @Column({ type: 'jsonb', nullable: true })
  campaign_brief: BriefSnapshot | null;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.PENDING_PAYMENT })
  status: ContractStatus;

  @Column({ nullable: true, length: 255 })
  stripe_charge_id: string;

  @Column({ nullable: true, length: 255 })
  stripe_transfer_id: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  payout_status: 'pending' | 'processing' | 'paid' | 'failed';

  @Column({ type: 'text', nullable: true })
  payout_error: string | null;

  @OneToMany('ContractRevisionRound', 'contrato')
  revision_rounds: any[];

  @OneToMany('ContractAuditLog', 'contrato')
  audit_logs: any[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
