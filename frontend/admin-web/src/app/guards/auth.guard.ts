import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { KeycloakAuthGuard, KeycloakService } from 'keycloak-angular';

@Injectable()
export class AuthGuard extends KeycloakAuthGuard implements CanActivate {
  constructor(
    protected override router: Router,
    protected keycloakService: KeycloakService
  ) {
    super(router, keycloakService);
  }

  isAccessAllowed(): Promise<boolean> {
    return new Promise(async (resolve) => {
      if (!this.authenticated) {
        this.keycloakService.login();
        resolve(false);
        return;
      }
      resolve(true);
    });
  }
}
