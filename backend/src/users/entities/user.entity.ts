import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from '../../common/enums';
import { EmpresaProfile } from '../../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../../influencers/entities/influencer-profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 255, select: false })
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ nullable: true, length: 255 })
  stripe_customer_id: string;

  @Column({ nullable: true, length: 255 })
  stripe_connect_id: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToOne(() => EmpresaProfile, (profile) => profile.user)
  empresaProfile: EmpresaProfile;

  @OneToOne(() => InfluencerProfile, (profile) => profile.user)
  influencerProfile: InfluencerProfile;
}
