import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { Payment, PaymentListResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(private api: ApiService) {}

  getPayments(params?: { userId?: string; orderId?: string; page?: number; limit?: number }): Observable<PaymentListResponse> {
    let httpParams = new HttpParams();
    if (params?.userId) httpParams = httpParams.set('userId', params.userId);
    if (params?.orderId) httpParams = httpParams.set('orderId', params.orderId);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    
    return this.api.get('/api/payments', httpParams);
  }

  getPayment(id: string): Observable<{ success: boolean; data: Payment }> {
    return this.api.get(`/api/payments/${id}`);
  }

  processPayment(data: any): Observable<{ success: boolean; message: string; data: Payment }> {
    return this.api.post('/api/payments', data);
  }

  refundPayment(id: string, data?: { amount?: number; reason?: string }): Observable<{ success: boolean; message: string; data: Payment }> {
    return this.api.post(`/api/payments/${id}/refund`, data);
  }

  getPaymentStatus(id: string): Observable<{ success: boolean; data: { paymentId: string; status: string; amount: number; currency: string } }> {
    return this.api.get(`/api/payments/${id}/status`);
  }
}
