export interface Transaction {
  id: string;
  paymentId: string;
  transactionId: string;
  type: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  gatewayResponse?: any;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  paymentIntentId?: string;
  description?: string;
  transactions: Transaction[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentListResponse {
  success: boolean;
  data: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
