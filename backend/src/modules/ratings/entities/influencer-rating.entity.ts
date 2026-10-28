import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { InfluencerProfile } from '../../influencers/entities/influencer-profile.entity';
import { CompanyProfile } from '../../companies/entities/company-profile.entity';

@Entity('influencer_ratings')
@Unique(['influencer_id', 'empresa_id'])
export class InfluencerRating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  influencer_id: number;

  @Column()
  empresa_id: number;

  @Column({ type: 'smallint' })
  estrellas: number; // 1–5

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => InfluencerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'influencer_id' })
  influencer: InfluencerProfile;

  @ManyToOne(() => CompanyProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: CompanyProfile;
}
