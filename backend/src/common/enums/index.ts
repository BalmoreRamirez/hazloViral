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
  PENDING_PAYMENT      = 'pending_payment',
  FUNDED_IN_ESCROW     = 'funded_in_escrow',
  UNDER_REVIEW         = 'under_review',
  CHANGES_REQUESTED    = 'changes_requested',
  PENDING_PUBLICATION  = 'pending_publication',
  PUBLICATION_REVIEW   = 'publication_review',
  COMPLETED            = 'completed',
  INCUMPLIMIENTO       = 'incumplimiento',
}

export enum ProposalStatus {
  PENDING          = 'pending',
  REJECTED         = 'rejected',
  COUNTERED        = 'countered',
  COUNTER_REJECTED = 'counter_rejected',
  ACCEPTED         = 'accepted',
  FUNDED           = 'funded',
}
