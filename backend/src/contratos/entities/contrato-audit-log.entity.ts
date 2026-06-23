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

@Entity('contrato_audit_log')
@Index('idx_audit_log_contrato', ['contrato_id', 'created_at'])
export class ContratoAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  contrato_id: number;

  @Column()
  actor_id: number;

  @Column({ length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  previous_status: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  new_status: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => ContratoEscrow, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contrato_id' })
  contrato: ContratoEscrow;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @CreateDateColumn()
  created_at: Date;
}
