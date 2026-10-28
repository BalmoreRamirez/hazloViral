import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProposalStatus } from '../../../common/enums';
import { Chat } from './chat.entity';
import { User } from '../../users/entities/user.entity';
import { CampaignBrief } from '../../campaigns/entities/campaign-brief.entity';
import { EscrowContract } from '../../contracts/entities/escrow-contract.entity';

import type { ProposalData, ContraofertaData } from '../../../common/types';

@Entity('messages')
@Index('idx_messages_chat_id', ['chat_id', 'created_at'])
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  chat_id: number;

  @Column()
  sender_id: number;

  @Column({ nullable: true })
  campaign_brief_id: number;

  @Column({ nullable: true })
  contrato_id: number;

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne(() => CampaignBrief, (brief) => brief.messages, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'campaign_brief_id' })
  campaignBrief: CampaignBrief;

  @ManyToOne(() => EscrowContract, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contrato_id' })
  contrato: EscrowContract;

  @Column({ type: 'text', nullable: true })
  message_text: string;

  @Column({ default: false })
  is_proposal: boolean;

  @Column({ type: 'jsonb', nullable: true })
  proposal_data: ProposalData;

  @Column({ type: 'jsonb', nullable: true })
  contraoferta_data: ContraofertaData;

  @Column({ type: 'enum', enum: ProposalStatus, nullable: true })
  proposal_status: ProposalStatus;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date | null;

  /**
   * Copia del brief tal como estaba al enviarlo. Si la empresa edita o borra el brief después,
   * el chat sigue mostrando lo que el influencer leyó, y el contrato copia esta versión.
   */
  @Column({ type: 'jsonb', nullable: true })
  campaign_brief_snapshot: Record<string, unknown> | null;

  @CreateDateColumn()
  created_at: Date;

  /** Si hay copia, el chat muestra la copia en lugar del brief actual (que pudo cambiar o borrarse). */
  toJSON() {
    const json: Record<string, unknown> = { ...(this as object) };
    if (this.campaign_brief_snapshot) {
      json.campaignBrief = { id: this.campaign_brief_id ?? null, ...this.campaign_brief_snapshot };
    }
    delete json.campaign_brief_snapshot;
    return json;
  }
}
