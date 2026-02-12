import { Component, OnInit } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-users',
  templateUrl: './template.html',
  styles: []
})
export class UsersComponent implements OnInit {
  showUserGuide = false;

  constructor(private keycloakService: KeycloakService) {}

  ngOnInit() {}

  refresh() {
    window.location.reload();
  }

  logout() {
    this.keycloakService.logout();
  }
}
