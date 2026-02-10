import { Component } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-home',
  template: `
    <nav class="navbar">
      <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
        <a class="navbar-brand" routerLink="/">Admin Dashboard</a>
        <div>
          <button *ngIf="!isLoggedIn" class="btn btn-primary" (click)="login()">Login</button>
          <button *ngIf="isLoggedIn" class="btn btn-primary" routerLink="/dashboard">Dashboard</button>
          <button *ngIf="isLoggedIn" class="btn btn-danger" style="margin-left: 10px;" (click)="logout()">Logout</button>
        </div>
      </div>
    </nav>

    <div class="container" style="padding-top: 50px;">
      <div style="text-align: center;">
        <h1 style="font-size: 48px; margin-bottom: 20px;">Admin Dashboard</h1>
        <p style="font-size: 20px; color: #666; margin-bottom: 40px;">
          Manage your microservices platform with our powerful admin tools.
        </p>
        
        <div class="grid" style="margin-top: 50px;">
          <div class="card">
            <h3>User Management</h3>
            <p>Manage users, roles, and permissions across all services.</p>
          </div>
          <div class="card">
            <h3>Service Monitoring</h3>
            <p>Monitor health and performance of all microservices.</p>
          </div>
          <div class="card">
            <h3>Analytics</h3>
            <p>View detailed analytics and reports.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class HomeComponent {
  isLoggedIn = false;

  constructor(private keycloakService: KeycloakService) {
    this.isLoggedIn = this.keycloakService.isLoggedIn();
  }

  login() {
    this.keycloakService.login();
  }

  logout() {
    this.keycloakService.logout();
  }
}
