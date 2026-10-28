import { calculateAge as calcAge } from '../../../common/utils/date.util';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { InfluencerMetric } from './influencer-metric.entity';
import { Chat } from '../../chats/entities/chat.entity';
import { EscrowContract } from '../../contracts/entities/escrow-contract.entity';

@Entity('influencers_profiles')
export class InfluencerProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @OneToOne(() => User, (user) => user.influencerProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 30, unique: true, nullable: true })
  username: string | null;

  @Column({ length: 255 })
  nombre_artistico: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true, length: 100 })
  ubicacion: string;

  @Column({ nullable: true, length: 255 })
  direccion: string;

  @Column({ nullable: true, length: 20 })
  tipo_identificacion: string; // 'DUI' | 'PASAPORTE'

  @Column({ nullable: true, length: 50 })
  numero_identificacion: string;

  // Datos bancarios para Wompi Dispersiones
  @Column({ nullable: true, length: 100 })
  banco_nombre: string;

  @Column({ nullable: true, length: 50 })
  banco_cuenta_numero: string;

  @Column({ nullable: true, length: 20 })
  banco_cuenta_tipo: string; // 'CORRIENTE' | 'AHORROS'

  @Column({ type: 'jsonb', nullable: true, name: 'rubro' })
  rubros: string[] | null;  // ['turismo', 'moda', 'fitness', ...]

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  tarifa_base: number;

  @Column({ default: true })
  disponibilidad: boolean;

  @Column({ type: 'date' })
  fecha_nacimiento: string;

  // Computed in application layer (mirrors DB generated column logic)
  get es_menor_edad(): boolean {
    if (!this.fecha_nacimiento) return false;
    return calcAge(this.fecha_nacimiento) < 18;
  }

  @Column({ nullable: true, length: 255 })
  tutor_nombre: string;

  @Column({ nullable: true, length: 100 })
  tutor_documento_id: string;

  @Column({ nullable: true, length: 255 })
  tutor_email: string;

  @Column({ default: false })
  tutor_autorizacion: boolean;

  @OneToMany(() => InfluencerMetric, (metric) => metric.influencer)
  metrics: InfluencerMetric[];

  @OneToMany(() => Chat, (chat) => chat.influencer)
  chats: Chat[];

  @OneToMany(() => EscrowContract, (contrato) => contrato.influencer)
  contratos: EscrowContract[];

  // Computed — requiere que las relaciones user y metrics estén cargadas
  get is_verified(): boolean {
    if (!this.user || !this.metrics) return false;
    const hasId = !!(this.tipo_identificacion && this.numero_identificacion);
    const hasVerifiedMetric = this.metrics.some((m) => m.is_verified);
    const hasAvatar = !!(this.user.avatar_url);
    const hasVerifiedEmail = this.user.is_email_verified;
    const isOldEnough = !!this.fecha_nacimiento && calcAge(this.fecha_nacimiento) >= 16;
    return hasId && hasVerifiedMetric && hasAvatar && hasVerifiedEmail && isOldEnough;
  }

  /**
   * Los getters no se incluyen al convertir a JSON, así que `is_verified` nunca llegaba al
   * frontend (el perfil propio mostraba "Perfil incompleto" aunque cumpliera todo).
   * Se agrega solo cuando las relaciones necesarias están cargadas; si no, se omite.
   */
  toJSON() {
    const json: Record<string, unknown> = { ...(this as object) };
    if (this.user && this.metrics) json.is_verified = this.is_verified;
    return json;
  }
}
