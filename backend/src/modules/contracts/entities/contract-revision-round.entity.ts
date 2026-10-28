import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EscrowContract } from './escrow-contract.entity';
import { User } from '../../users/entities/user.entity';

@Entity('contrato_revision_rounds')
@Index('idx_revision_rounds_contrato', ['contrato_id'])
@Unique('uq_contract_revision_round_number', ['contrato_id', 'round_number'])
@Check('chk_contract_revision_round_positive', 'round_number > 0')
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

  @ManyToOne(() => EscrowContract, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'contrato_id' })
  contrato: EscrowContract;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requested_by' })
  requester: User;

  @CreateDateColumn()
  created_at: Date;
}
