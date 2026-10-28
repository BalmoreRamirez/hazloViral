import {
  Column,
  Check,
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
@Check('chk_influencer_rating_stars', 'estrellas BETWEEN 1 AND 5')
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

  @ManyToOne(() => InfluencerProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'influencer_id' })
  influencer: InfluencerProfile;

  @ManyToOne(() => CompanyProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: CompanyProfile;
}
