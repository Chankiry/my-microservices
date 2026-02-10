import { Component, OnInit } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-dashboard',
  template: `
    <nav class="navbar">
      <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
        <a class="navbar-brand" routerLink="/">Admin Dashboard</a>
        <div class="navbar-nav">
          <a class="nav-link" routerLink="/">Home</a>
          <a class="nav-link" routerLink="/dashboard">Dashboard</a>
          <button class="btn btn-danger" (click)="logout()">Logout</button>
        </div>
      </div>
    </nav>

    <div class="container" style="padding-top: 30px;">
      <h1 style="margin-bottom: 30px;">Dashboard</h1>
      
      <div class="grid">
        <div class="card">
          <h3>User Information</h3>
          <p><strong>Username:</strong> {{ userProfile?.username }}</p>
          <p><strong>Email:</strong> {{ userProfile?.email }}</p>
          <p><strong>Name:</strong> {{ userProfile?.firstName }} {{ userProfile?.lastName }}</p>
        </div>
        
        <div class="card">
          <h3>Roles</h3>
          <ul>
            <li *ngFor="let role of userRoles">{{ role }}</li>
          </ul>
        </div>
        
        <div class="card">
          <h3>System Status</h3>
          <p style="color: green;">All services operational</p>
          <p>Auth Service: Online</p>
          <p>User Service: Online</p>
          <p>Order Service: Online</p>
          <p>Payment Service: Online</p>
          <p>Notification Service: Online</p>
        </div>
      </div>

      <div class="card" style="margin-top: 30px;">
        <h3>Recent Activity</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: left; padding: 10px;">Action</th>
              <th style="text-align: left; padding: 10px;">User</th>
              <th style="text-align: left; padding: 10px;">Time</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px;">Login</td>
              <td style="padding: 10px;">{{ userProfile?.username }}</td>
              <td style="padding: 10px;">Just now</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit {
  userProfile: any = {};
  userRoles: string[] = [];

  constructor(private keycloakService: KeycloakService) {}

  async ngOnInit() {
    if (await this.keycloakService.isLoggedIn()) {
      this.userProfile = await this.keycloakService.loadUserProfile();
      const tokenParsed = this.keycloakService.getKeycloakInstance().tokenParsed;
      this.userRoles = tokenParsed?.realm_access?.roles || [];
    }
  }

  logout() {
    this.keycloakService.logout();
  }
}
