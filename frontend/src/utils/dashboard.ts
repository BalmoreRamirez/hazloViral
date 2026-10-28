import type { Contract } from '@/stores/contracts'

const activeStates = ['funded_in_escrow', 'under_review', 'changes_requested', 'pending_publication', 'publication_review']

export function contractTask(contract: Pick<Contract, 'status'>, company: boolean) {
  const tasks = company ? {
    under_review: { title: 'Revisa los entregables', action: 'Revisar', icon: 'pi-eye', priority: 0 },
    publication_review: { title: 'Verifica la publicación', action: 'Ver publicación', icon: 'pi-check-square', priority: 1 },
    pending_payment: { title: 'Fondea el contrato para comenzar', action: 'Ver fondeo', icon: 'pi-wallet', priority: 2 },
  } : {
    changes_requested: { title: 'Atiende los cambios solicitados', action: 'Ver cambios', icon: 'pi-pencil', priority: 0 },
    funded_in_escrow: { title: 'Prepara y entrega tu contenido', action: 'Ver entregables', icon: 'pi-upload', priority: 1 },
    pending_publication: { title: 'Publica y registra tus enlaces', action: 'Publicar', icon: 'pi-link', priority: 2 },
  }
  return tasks[contract.status as keyof typeof tasks] ?? null
}

export function dashboardSummary(contracts: Contract[], company: boolean) {
  const cents = (value: number) => Number.isFinite(value) ? Math.round(value * 100) : 0
  const amount = (contract: Contract) => Math.max(0, cents(Number(contract.monto_total)) - (company ? 0 : cents(Number(contract.comision_plataforma))))
  const active = contracts.filter(contract => activeStates.includes(contract.status))
  const paid = contracts.filter(contract => contract.payout_status === 'paid' || (!!contract.stripe_transfer_id && contract.payout_status !== 'failed' && contract.payout_status !== 'processing'))
  return {
    active: active.length,
    reviews: contracts.filter(contract => ['under_review', 'publication_review'].includes(contract.status)).length,
    funding: contracts.filter(contract => contract.status === 'pending_payment').length,
    tasks: contracts.filter(contract => !!contractTask(contract, company)).length,
    inProgressAmount: active.reduce((sum, contract) => sum + amount(contract), 0) / 100,
    confirmedAmount: paid.reduce((sum, contract) => sum + amount(contract), 0) / 100,
  }
}
