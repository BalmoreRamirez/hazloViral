import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ContratoStatus } from '../../common/enums';
import { Chat } from '../../chats/entities/chat.entity';
import { EmpresaProfile } from '../../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../../influencers/entities/influencer-profile.entity';
import type { EntregableConArchivos, PublicationLink } from '../../common/types';

@Entity('contratos_escrow')
@Index('idx_contratos_status', ['status'])
export class ContratoEscrow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  chat_id: number;

  @Column()
  empresa_id: number;

  @Column()
  influencer_id: number;

  @ManyToOne(() => Chat, (chat) => chat.contratos, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @ManyToOne(() => EmpresaProfile, (empresa) => empresa.contratos, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: EmpresaProfile;

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

  @Column({ type: 'enum', enum: ContratoStatus, default: ContratoStatus.PENDING_PAYMENT })
  status: ContratoStatus;

  @Column({ nullable: true, length: 255 })
  stripe_charge_id: string;

  @Column({ nullable: true, length: 255 })
  stripe_transfer_id: string;

  @OneToMany('ContratoRevisionRound', 'contrato')
  revision_rounds: any[];

  @OneToMany('ContratoAuditLog', 'contrato')
  audit_logs: any[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
