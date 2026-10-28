import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { InfluencerProfile } from './influencer-profile.entity';

@Entity('influencer_metrics')
@Index('idx_metrics_search', ['red_social', 'seguidores', 'engagement_rate'])
@Unique('uq_metric_platform_username', ['red_social', 'username'])
export class InfluencerMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  influencer_id: number;

  @ManyToOne(() => InfluencerProfile, (profile) => profile.metrics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'influencer_id' })
  influencer: InfluencerProfile;

  @Column({ length: 50 })
  red_social: string;

  @Column({ length: 100 })
  username: string;

  @Column({ default: 0 })
  seguidores: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  engagement_rate: number;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verified_at: Date | null;

  @UpdateDateColumn()
  updated_at: Date;
}
