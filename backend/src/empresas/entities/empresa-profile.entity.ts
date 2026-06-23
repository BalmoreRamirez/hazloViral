import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CampaignBrief } from '../../campaigns/entities/campaign-brief.entity';
import { Chat } from '../../chats/entities/chat.entity';
import { ContratoEscrow } from '../../contratos/entities/contrato-escrow.entity';

@Entity('empresas_profiles')
export class EmpresaProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @OneToOne(() => User, (user) => user.empresaProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 255 })
  nombre_comercial: string;

  @Column({ nullable: true, length: 255 })
  sitio_web: string;

  @Column({ nullable: true, length: 100 })
  pais: string;

  @Column({ nullable: true, length: 255 })
  direccion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 10.0 })
  balance_creditos: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 5.0 })
  umbral_creditos: number;

  @OneToMany(() => CampaignBrief, (brief) => brief.empresa)
  briefs: CampaignBrief[];

  @OneToMany(() => Chat, (chat) => chat.empresa)
  chats: Chat[];

  @OneToMany(() => ContratoEscrow, (contrato) => contrato.empresa)
  contratos: ContratoEscrow[];
}
