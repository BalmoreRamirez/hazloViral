import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EmpresaProfile } from '../../empresas/entities/empresa-profile.entity';
import { Message } from '../../chats/entities/message.entity';

@Entity('campaign_briefs')
export class CampaignBrief {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  empresa_id: number;

  @ManyToOne(() => EmpresaProfile, (empresa) => empresa.briefs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: EmpresaProfile;

  @Column({ length: 255 })
  titulo_campana: string;

  @Column({ type: 'text', nullable: true })
  objetivo_principal: string;

  @Column({ nullable: true, length: 100 })
  tono_de_voz: string;

  @Column({ type: 'text', nullable: true })
  puntos_clave_si: string;

  @Column({ type: 'text', nullable: true })
  restricciones_no: string;

  @Column({ type: 'text', nullable: true })
  recursos_esteticos: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Message, (msg) => msg.campaignBrief)
  messages: Message[];
}
