export interface ProposalData {
  tarifa: number;
  entregables: { tipo: string; descripcion: string }[];
  plazo: string;
  contrato_pdf_url?: string;
}

export interface ContraofertaData {
  tarifa_propuesta: number;
  justificacion: string;
}

export interface ArchivoEntregable {
  url: string;
  tipo_archivo: 'video' | 'imagen' | 'banner' | 'documento';
  nombre: string;
  size_bytes: number;
}

export interface EntregableConArchivos {
  tipo: string;
  descripcion: string;
  archivos: ArchivoEntregable[];
}

export interface PublicationLink {
  red_social: string;
  url: string;
  publicado_at: string;
}
