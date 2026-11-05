import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from '../../../common/enums';
import { CompanyProfile } from '../../companies/entities/company-profile.entity';
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

  @Column({ nullable: true, length: 500 })
  avatar_url: string;

  @Column({ nullable: true, length: 255 })
  stripe_customer_id: string;

  @Column({ nullable: true, length: 255 })
  stripe_connect_id: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_email_verified: boolean;

  /** Incremented to invalidate every previously issued bearer token. */
  @Column({ type: 'integer', default: 0, select: false })
  session_version: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  last_activity_at: Date;

  @Column({ type: 'jsonb', nullable: true, select: false })
  registration_consent: Record<string, unknown> | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToOne(() => CompanyProfile, (profile) => profile.user)
  empresaProfile: CompanyProfile;

  @OneToOne(() => InfluencerProfile, (profile) => profile.user)
  influencerProfile: InfluencerProfile;
}
