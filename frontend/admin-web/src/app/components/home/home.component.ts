import { Component } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-home',
  template: `
    <nav class="navbar">
      <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
        <a class="navbar-brand" routerLink="/">Admin Dashboard</a>
        <div class="navbar-nav">
          <a class="nav-link" routerLink="/">Home</a>
          <a *ngIf="isLoggedIn" class="nav-link" routerLink="/dashboard">Dashboard</a>
          <a *ngIf="isLoggedIn" class="nav-link" routerLink="/users">Users</a>
          <a *ngIf="isLoggedIn" class="nav-link" routerLink="/orders">Orders</a>
          <a *ngIf="isLoggedIn" class="nav-link" routerLink="/payments">Payments</a>
          <a *ngIf="isLoggedIn" class="nav-link" routerLink="/notifications">Notifications</a>
          <button *ngIf="isLoggedIn" class="btn btn-danger" style="margin-left: 10px;" (click)="logout()">Logout</button>
          <button *ngIf="!isLoggedIn" class="btn btn-primary" (click)="login()">Login</button>
        </div>
      </div>
    </nav>

    <div class="container" style="padding-top: 50px;">
      <div style="text-align: center;">
        <h1 style="font-size: 48px; margin-bottom: 20px;">Admin Dashboard</h1>
        <p style="font-size: 20px; color: #666; margin-bottom: 40px;">
          Manage your microservices platform with our powerful admin tools.
        </p>
        
        <div *ngIf="isLoggedIn" class="grid" style="margin-top: 50px;">
          <div class="card" routerLink="/users" style="cursor: pointer;">
            <h3>User Management</h3>
            <p>Manage users, profiles, and preferences across all services.</p>
            <span style="color: #007bff;">Go to Users →</span>
          </div>
          <div class="card" routerLink="/orders" style="cursor: pointer;">
            <h3>Order Management</h3>
            <p>View and manage customer orders and order statuses.</p>
            <span style="color: #007bff;">Go to Orders →</span>
          </div>
          <div class="card" routerLink="/payments" style="cursor: pointer;">
            <h3>Payment Management</h3>
            <p>Process payments, handle refunds, and view transactions.</p>
            <span style="color: #007bff;">Go to Payments →</span>
          </div>
          <div class="card" routerLink="/notifications" style="cursor: pointer;">
            <h3>Notifications</h3>
            <p>Send notifications and view email logs.</p>
            <span style="color: #007bff;">Go to Notifications →</span>
          </div>
          <div class="card" routerLink="/dashboard" style="cursor: pointer;">
            <h3>System Dashboard</h3>
            <p>View system status, metrics, and health checks.</p>
            <span style="color: #007bff;">Go to Dashboard →</span>
          </div>
        </div>

        <div *ngIf="!isLoggedIn" style="margin-top: 50px;">
          <div class="grid">
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
          <div style="margin-top: 30px;">
            <button class="btn btn-primary" (click)="login()" style="padding: 15px 40px; font-size: 18px;">
              Login to Access Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }
  `]
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
