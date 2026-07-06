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
import { ContratoEscrow } from '../../contratos/entities/contrato-escrow.entity';

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

@Entity('influencers_profiles')
export class InfluencerProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @OneToOne(() => User, (user) => user.influencerProfile)
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

  @Column({ nullable: true, length: 50 })
  rubro: string;  // turismo, gastronomia, moda, tecnologia, fitness, etc.

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  tarifa_base: number;

  @Column({ default: true })
  disponibilidad: boolean;

  @Column({ type: 'date' })
  fecha_nacimiento: string;

  // Computed in application layer (mirrors DB generated column logic)
  get es_menor_edad(): boolean {
    if (!this.fecha_nacimiento) return false;
    const birth = new Date(this.fecha_nacimiento);
    const age18 = new Date();
    age18.setFullYear(age18.getFullYear() - 18);
    return birth > age18;
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

  @OneToMany(() => ContratoEscrow, (contrato) => contrato.influencer)
  contratos: ContratoEscrow[];

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
}
