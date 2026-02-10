import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-login',
  template: `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5;">
      <div class="card" style="width: 400px; text-align: center;">
        <h2 style="margin-bottom: 20px;">Admin Login</h2>
        <p style="color: #666; margin-bottom: 30px;">
          Please click the button below to login with Keycloak.
        </p>
        <button class="btn btn-primary" style="width: 100%;" (click)="login()">
          Login with Keycloak
        </button>
        <p style="margin-top: 20px;">
          <a routerLink="/" style="color: #007bff;">Back to Home</a>
        </p>
      </div>
    </div>
  `,
  styles: []
})
export class LoginComponent implements OnInit {
  constructor(
    private keycloakService: KeycloakService,
    private router: Router
  ) {}

  ngOnInit() {
    if (this.keycloakService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  login() {
    this.keycloakService.login();
  }
}
