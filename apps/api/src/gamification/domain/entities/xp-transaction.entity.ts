export interface XpTransactionEntity {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  createdAt: Date;
}
