import { CommonModule }         from '@angular/common';
import { Component }            from '@angular/core';
import { MatIconModule }        from '@angular/material/icon';
import { TranslocoModule }      from '@ngneat/transloco';
import { AuthSignInComponent }  from './sign-in/component';
import { env }                  from 'envs/env';

@Component({
    standalone  : true,
    styleUrl    : './style.scss',
    templateUrl : 'template.html',
    imports     : [
        CommonModule,
        MatIconModule,
        TranslocoModule,
        AuthSignInComponent,
    ],
})
export class AuthLayoutComponent {
    public appVersion: string = env.APP_VERSION;
}
