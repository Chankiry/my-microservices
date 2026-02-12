import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { UserProfile, Profile, Preference } from '../models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private api: ApiService) {}

  getProfile(userId: string): Observable<{ success: boolean; data: Profile }> {
    return this.api.get(`/api/users/${userId}/profile`);
  }

  createProfile(userId: string, data: Partial<Profile>): Observable<{ success: boolean; message: string; data: Profile }> {
    return this.api.post(`/api/users/${userId}/profile`, data);
  }

  updateProfile(userId: string, data: Partial<Profile>): Observable<{ success: boolean; message: string; data: Profile }> {
    return this.api.put(`/api/users/${userId}/profile`, data);
  }

  deleteProfile(userId: string): Observable<{ success: boolean; message: string }> {
    return this.api.delete(`/api/users/${userId}/profile`);
  }

  getPreferences(userId: string): Observable<{ success: boolean; data: Preference }> {
    return this.api.get(`/api/users/${userId}/preferences`);
  }

  createPreferences(userId: string, data: Partial<Preference>): Observable<{ success: boolean; message: string; data: Preference }> {
    return this.api.post(`/api/users/${userId}/preferences`, data);
  }

  updatePreferences(userId: string, data: Partial<Preference>): Observable<{ success: boolean; message: string; data: Preference }> {
    return this.api.put(`/api/users/${userId}/preferences`, data);
  }
}
