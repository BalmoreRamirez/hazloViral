import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('password_reset_tokens')
@Index('uq_password_reset_token_hash', ['token_hash'], { unique: true })
@Index('idx_password_reset_tokens_user_id', ['user_id'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** SHA-256 del token raw que va en el email — nunca guardamos el raw */
  @Column({ length: 64 })
  token_hash: string;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn()
  created_at: Date;
}
