export enum UserRole {
  EMPRESA = 'empresa',
  INFLUENCER = 'influencer',
  ADMIN = 'admin',
}

export enum ChatStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
}

export enum ContratoStatus {
  PENDING_PAYMENT = 'pending_payment',
  FUNDED_IN_ESCROW = 'funded_in_escrow',
  UNDER_REVIEW = 'under_review',
  COMPLETED = 'completed',
  IN_DISPUTE = 'in_dispute',
}

export enum ProposalStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  COUNTERED = 'countered',
  FUNDED = 'funded',
}
