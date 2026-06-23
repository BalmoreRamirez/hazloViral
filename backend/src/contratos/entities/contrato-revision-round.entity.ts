import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContratoEscrow } from './contrato-escrow.entity';
import { User } from '../../users/entities/user.entity';

@Entity('contrato_revision_rounds')
@Index('idx_revision_rounds_contrato', ['contrato_id'])
export class ContratoRevisionRound {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  contrato_id: number;

  @Column({ type: 'int' })
  round_number: number;

  @Column({ type: 'text' })
  feedback: string;

  @Column()
  requested_by: number;

  @ManyToOne(() => ContratoEscrow, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contrato_id' })
  contrato: ContratoEscrow;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requested_by' })
  requester: User;

  @CreateDateColumn()
  created_at: Date;
}
