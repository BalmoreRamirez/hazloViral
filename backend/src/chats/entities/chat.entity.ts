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
import { ChatStatus } from '../../common/enums';
import { EmpresaProfile } from '../../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../../influencers/entities/influencer-profile.entity';
import { Message } from './message.entity';
import { ContratoEscrow } from '../../contratos/entities/contrato-escrow.entity';

@Entity('chats')
@Unique('unique_chat_relation', ['empresa_id', 'influencer_id'])
export class Chat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  empresa_id: number;

  @Column()
  influencer_id: number;

  @ManyToOne(() => EmpresaProfile, (empresa) => empresa.chats, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: EmpresaProfile;

  @ManyToOne(() => InfluencerProfile, (influencer) => influencer.chats, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'influencer_id' })
  influencer: InfluencerProfile;

  @Column({ type: 'enum', enum: ChatStatus, default: ChatStatus.ACTIVE })
  status: ChatStatus;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Message, (msg) => msg.chat)
  messages: Message[];

  @OneToMany(() => ContratoEscrow, (contrato) => contrato.chat)
  contratos: ContratoEscrow[];
}
