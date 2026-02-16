import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { Order, OrderListResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(private api: ApiService) {}

  getOrders(params?: { userId?: string; page?: number; limit?: number }): Observable<OrderListResponse> {
    let httpParams = new HttpParams();
    if (params?.userId) httpParams = httpParams.set('userId', params.userId);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    
    return this.api.get('/orders', httpParams);
  }

  getOrder(id: string): Observable<{ success: boolean; data: Order }> {
    return this.api.get(`/orders/${id}`);
  }

  createOrder(data: any): Observable<{ success: boolean; message: string; data: Order }> {
    return this.api.post('/orders', data);
  }

  updateOrderStatus(id: string, status: string, reason?: string): Observable<{ success: boolean; message: string; data: Order }> {
    return this.api.put(`/orders/${id}/status`, { status, reason });
  }

  cancelOrder(id: string): Observable<{ success: boolean; message: string; data: Order }> {
    return this.api.delete(`/orders/${id}`);
  }
}
