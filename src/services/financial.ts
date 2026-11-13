import pb from '@/lib/pocketbase/client'

export interface FinancialTransactionRecord {
  id: string
  patient?: string
  professional?: string
  transaction_type: 'receita' | 'despesa'
  category?:
    | 'consulta'
    | 'procedimento'
    | 'produto'
    | 'salario'
    | 'aluguel'
    | 'despesa_operacional'
    | 'outros'
  description: string
  amount: number
  payment_method?:
    | 'pix'
    | 'boleto'
    | 'cartao'
    | 'cartao_credito'
    | 'cartao_debito'
    | 'dinheiro'
    | 'cartao_taxa'
  status?: 'pago' | 'pendente' | 'cancelado'
  transaction_date: string
  /** Percentual da taxa de cartão lançada como despesa interna (null = sem taxa). */
  card_fee_percent?: number | null
  created: string
  expand?: {
    patient?: any
  }
}

export const getFinancialTransactions = (filter?: string) =>
  pb.collection('financial_transactions').getFullList<FinancialTransactionRecord>({
    filter,
    sort: '-transaction_date',
    expand: 'patient,professional',
  })

export const createTransaction = (data: Partial<FinancialTransactionRecord>) =>
  pb.collection('financial_transactions').create<FinancialTransactionRecord>(data)

export const updateTransaction = (id: string, data: Partial<FinancialTransactionRecord>) =>
  pb.collection('financial_transactions').update<FinancialTransactionRecord>(id, data)

export const deleteTransaction = (id: string) => pb.collection('financial_transactions').delete(id)
