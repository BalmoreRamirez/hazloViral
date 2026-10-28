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

/** Calificación que un influencer da a una marca tras completar un contrato (una por par). */
@Entity('empresa_ratings')
@Unique(['empresa_id', 'influencer_id'])
@Check('chk_company_rating_stars', 'estrellas BETWEEN 1 AND 5')
export class CompanyRating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  empresa_id: number;

  @Column()
  influencer_id: number;

  @Column({ type: 'smallint' })
  estrellas: number; // 1 a 5

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => CompanyProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: CompanyProfile;

  @ManyToOne(() => InfluencerProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'influencer_id' })
  influencer: InfluencerProfile;
}
