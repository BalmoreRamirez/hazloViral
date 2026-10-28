import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('dte_contingency_events')
@Index('uq_dte_contingency_generation', ['codigo_generacion_evento'], { unique: true })
export class InvoiceContingencyEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  codigo_generacion_evento: string;

  @Column({ type: 'date' })
  fecha_inicio: string;

  @Column({ type: 'time' })
  hora_inicio: string;

  @Column({ type: 'date' })
  fecha_fin: string;

  @Column({ type: 'time' })
  hora_fin: string;

  @Column({ type: 'int' })
  tipo_contingencia: number;

  @Column({ type: 'varchar', length: 500 })
  motivo_contingencia: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  sello_recibido: string | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado: string;

  @CreateDateColumn()
  created_at: Date;
}
