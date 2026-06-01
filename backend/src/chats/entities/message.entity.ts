import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProposalStatus } from '../../common/enums';
import { Chat } from './chat.entity';
import { User } from '../../users/entities/user.entity';
import { CampaignBrief } from '../../campaigns/entities/campaign-brief.entity';
import { ContratoEscrow } from '../../contratos/entities/contrato-escrow.entity';

import type { ProposalData } from '../../common/types';

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

  @ManyToOne(() => ContratoEscrow, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contrato_id' })
  contrato: ContratoEscrow;

  @Column({ type: 'text', nullable: true })
  message_text: string;

  @Column({ default: false })
  is_proposal: boolean;

  @Column({ type: 'jsonb', nullable: true })
  proposal_data: ProposalData;

  @Column({ type: 'enum', enum: ProposalStatus, nullable: true })
  proposal_status: ProposalStatus;

  @CreateDateColumn()
  created_at: Date;
}
