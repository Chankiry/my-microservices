import { CommonModule }     from '@angular/common';
import { Component }        from '@angular/core';
import { RouterOutlet }     from '@angular/router';
import { MatIconModule }    from '@angular/material/icon';
import { TranslocoModule }  from '@ngneat/transloco';
import { env }              from 'envs/env';
import { LanguagesComponent } from 'app/layout/common/languages/languages.component';

@Component({
    standalone  : true,
    styleUrl    : './style.scss',
    templateUrl : 'template.html',
    imports     : [
        CommonModule,
        RouterOutlet,
        MatIconModule,
        TranslocoModule,
        LanguagesComponent
    ],
})
export class AuthLayoutComponent {
    public appVersion: string = env.APP_VERSION;
}
