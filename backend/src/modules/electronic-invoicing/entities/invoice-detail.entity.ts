import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ElectronicInvoice } from './electronic-invoice.entity';

@Entity('dte_details')
@Unique('uq_dte_detail_document_item', ['dte_id', 'num_item'])
export class InvoiceDetail {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  dte_id: string;

  @ManyToOne(() => ElectronicInvoice, (dte) => dte.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dte_id' })
  dte: ElectronicInvoice;

  @Column({ type: 'int' })
  num_item: number;

  @Column({ type: 'int', default: 2 })
  tipo_item: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  codigo: string | null;

  @Column({ type: 'varchar', length: 1000 })
  descripcion: string;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  cantidad: number;

  @Column({ type: 'int', default: 59 })
  unidad_medida: number;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  precio_unitario: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  monto_descuento: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  venta_gravada: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  venta_exenta: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  venta_no_sujeta: number;

  @Column({ type: 'jsonb', nullable: true })
  tributos: string[] | null;
}
