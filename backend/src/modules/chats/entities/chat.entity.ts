import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ChatStatus } from '../../../common/enums';
import { CompanyProfile } from '../../companies/entities/company-profile.entity';
import { InfluencerProfile } from '../../influencers/entities/influencer-profile.entity';
import { Message } from './message.entity';
import { EscrowContract } from '../../contracts/entities/escrow-contract.entity';

@Entity('chats')
@Unique('unique_chat_relation', ['empresa_id', 'influencer_id'])
@Unique('uq_chat_id_parties', ['id', 'empresa_id', 'influencer_id'])
export class Chat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  empresa_id: number;

  @Column()
  influencer_id: number;

  @ManyToOne(() => CompanyProfile, (empresa) => empresa.chats, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: CompanyProfile;

  @ManyToOne(() => InfluencerProfile, (influencer) => influencer.chats, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'influencer_id' })
  influencer: InfluencerProfile;

  @Column({ type: 'enum', enum: ChatStatus, default: ChatStatus.ACTIVE })
  status: ChatStatus;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Message, (msg) => msg.chat)
  messages: Message[];

  @OneToMany(() => EscrowContract, (contrato) => contrato.chat)
  contratos: EscrowContract[];
}
