import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { KeycloakService } from './app/services/keycloak.service';

// Initialize Keycloak before bootstrapping the app
KeycloakService.init().then(() => {
  bootstrapApplication(AppComponent, {
    providers: [
      provideRouter(routes),
      provideHttpClient(),
      provideAnimations(),
      KeycloakService,
    ],
  }).catch((err) => console.error(err));
}).catch((err) => {
  console.error('Keycloak initialization failed:', err);
  // Bootstrap anyway to show error page
  bootstrapApplication(AppComponent, {
    providers: [
      provideRouter(routes),
      provideHttpClient(),
      provideAnimations(),
      KeycloakService,
    ],
  }).catch((e) => console.error(e));
});
