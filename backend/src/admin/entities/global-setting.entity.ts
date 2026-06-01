import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('global_settings')
export class GlobalSetting {
  @PrimaryColumn({ length: 100 })
  key: string;

  @Column({ length: 255 })
  value: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
