import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EscrowContract } from './escrow-contract.entity';
import { User } from '../../users/entities/user.entity';

@Entity('contrato_revision_rounds')
@Index('idx_revision_rounds_contrato', ['contrato_id'])
export class ContractRevisionRound {
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

  @ManyToOne(() => EscrowContract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contrato_id' })
  contrato: EscrowContract;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requested_by' })
  requester: User;

  @CreateDateColumn()
  created_at: Date;
}
