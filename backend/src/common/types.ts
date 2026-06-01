export interface ProposalData {
  tarifa: number;
  entregables: { tipo: string; descripcion: string }[];
  plazo: string;
}
