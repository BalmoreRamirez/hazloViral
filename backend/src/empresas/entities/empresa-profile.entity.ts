import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CampaignBrief } from '../../campaigns/entities/campaign-brief.entity';
import { Chat } from '../../chats/entities/chat.entity';
import { ContratoEscrow } from '../../contratos/entities/contrato-escrow.entity';

/**
 * Vista segura de una empresa para mostrar a influencers (chat, contratos).
 * Omite datos fiscales, de contacto privado, saldo y documento del representante.
 */
export function toPublicEmpresa(e: EmpresaProfile | null | undefined) {
  if (!e) return e;
  return {
    id:               e.id,
    user_id:          e.user_id,
    nombre_comercial: e.nombre_comercial,
    descripcion:      e.descripcion,
    rubro:            e.rubro,
    pais:             e.pais,
    sitio_web:        e.sitio_web,
    instagram_url:    e.instagram_url,
    tiktok_url:       e.tiktok_url,
    user:             e.user ? { id: e.user.id, avatar_url: e.user.avatar_url } : undefined,
    is_verified:      e.is_verified,
  };
}

@Entity('empresas_profiles')
export class EmpresaProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @OneToOne(() => User, (user) => user.empresaProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 255 })
  nombre_comercial: string;

  @Column({ nullable: true, length: 255 })
  razon_social: string;           // Nombre legal registrado

  @Column({ nullable: true, length: 20 })
  nit: string;                    // NIT de la empresa (facturación)

  @Column({ nullable: true, length: 20 })
  nrc: string;                    // Número de Registro de Contribuyente (crédito fiscal)

  @Column({ nullable: true, length: 30 })
  telefono: string;               // Teléfono / WhatsApp de contacto

  @Column({ nullable: true, length: 255 })
  email_facturacion: string;      // Contacto de facturación (puede diferir del usuario)

  @Column({ type: 'text', nullable: true })
  descripcion: string;            // Descripción pública de la marca

  @Column({ nullable: true, length: 255 })
  instagram_url: string;

  @Column({ nullable: true, length: 255 })
  tiktok_url: string;

  @Column({ nullable: true, length: 255 })
  sitio_web: string;

  @Column({ nullable: true, length: 100 })
  pais: string;

  @Column({ nullable: true, length: 255 })
  direccion: string;

  @Column({ nullable: true, length: 255 })
  representante_nombre: string;

  @Column({ nullable: true, length: 20 })
  representante_tipo_identificacion: string; // 'DUI' | 'PASAPORTE'

  @Column({ nullable: true, length: 50 })
  representante_numero_identificacion: string;

  @Column({ nullable: true, length: 50 })
  rubro: string;  // turismo, gastronomia, moda, tecnologia, etc.

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 10.0 })
  balance_creditos: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 5.0 })
  umbral_creditos: number;

  @OneToMany(() => CampaignBrief, (brief) => brief.empresa)
  briefs: CampaignBrief[];

  @OneToMany(() => Chat, (chat) => chat.empresa)
  chats: Chat[];

  @OneToMany(() => ContratoEscrow, (contrato) => contrato.empresa)
  contratos: ContratoEscrow[];

  // Computed — requiere que la relación user esté cargada
  get verification_checklist(): Record<string, boolean> {
    return {
      email_verificado: !!this.user?.is_email_verified,
      logo:             !!this.user?.avatar_url,
      nit:              !!this.nit,
      representante:    !!(this.representante_nombre && this.representante_numero_identificacion),
      telefono:         !!this.telefono,
      presencia_online: !!(this.sitio_web || this.instagram_url || this.tiktok_url),
    };
  }

  get is_verified(): boolean {
    if (!this.user) return false;
    return Object.values(this.verification_checklist).every(Boolean);
  }
}
