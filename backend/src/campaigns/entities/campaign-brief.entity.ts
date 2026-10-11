import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EmpresaProfile } from '../../empresas/entities/empresa-profile.entity';
import { Message } from '../../chats/entities/message.entity';

export const PLATAFORMAS_BRIEF = ['TikTok', 'Instagram', 'Facebook', 'YouTube'] as const;

/** Derechos de uso del contenido por parte de la marca */
export const DERECHOS_USO = ['organico', 'ads_30', 'ads_90', 'ads_180', 'ads_365'] as const;
export type DerechosUso = (typeof DERECHOS_USO)[number];

export interface BriefArchivo {
  url: string;
  nombre: string;
  tipo_archivo: string;
  size_bytes: number;
}

/** Campos de contenido del brief — se copian al snapshot del contrato al aceptarse una propuesta */
export const BRIEF_CONTENT_FIELDS = [
  'titulo_campana', 'objetivo_principal', 'tono_de_voz', 'puntos_clave_si', 'restricciones_no',
  'recursos_esteticos', 'presupuesto_min', 'presupuesto_max', 'publico_objetivo', 'fecha_inicio',
  'fecha_fin', 'plataformas', 'formatos', 'hashtags_menciones', 'derechos_uso', 'exclusividad_dias',
  'exclusividad_detalle', 'requiere_disclosure', 'archivos',
] as const;

@Entity('campaign_briefs')
export class CampaignBrief {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  empresa_id: number;

  @ManyToOne(() => EmpresaProfile, (empresa) => empresa.briefs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: EmpresaProfile;

  @Column({ length: 255 })
  titulo_campana: string;

  @Column({ type: 'text', nullable: true })
  objetivo_principal: string;

  @Column({ nullable: true, length: 100 })
  tono_de_voz: string;

  @Column({ type: 'text', nullable: true })
  puntos_clave_si: string;

  @Column({ type: 'text', nullable: true })
  restricciones_no: string;

  @Column({ type: 'text', nullable: true })
  recursos_esteticos: string;

  // ── Presupuesto y audiencia ─────────────────────────────────────────────────
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  presupuesto_min: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  presupuesto_max: number | null;

  @Column({ type: 'text', nullable: true })
  publico_objetivo: string | null;   // Edad, país, intereses

  // ── Calendario y formatos ───────────────────────────────────────────────────
  @Column({ type: 'date', nullable: true })
  fecha_inicio: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_fin: string | null;

  @Column({ type: 'jsonb', nullable: true })
  plataformas: string[] | null;       // Ver PLATAFORMAS_BRIEF

  @Column({ type: 'text', nullable: true })
  formatos: string | null;            // Ej.: "1 Reel de 30s + 3 Stories"

  @Column({ type: 'text', nullable: true })
  hashtags_menciones: string | null;  // Ej.: "#MarcaX @marcax link en bio"

  // ── Condiciones comerciales ─────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 20, nullable: true })
  derechos_uso: DerechosUso | null;

  @Column({ type: 'int', nullable: true })
  exclusividad_dias: number | null;   // 0 / null = sin exclusividad

  @Column({ type: 'text', nullable: true })
  exclusividad_detalle: string | null; // Categorías o marcas competidoras excluidas

  @Column({ default: true })
  requiere_disclosure: boolean;       // Uso obligatorio de #publi / #ad

  @Column({ type: 'jsonb', nullable: true })
  archivos: BriefArchivo[] | null;    // Logos, moodboards, guías de marca

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Message, (msg) => msg.campaignBrief)
  messages: Message[];
}
