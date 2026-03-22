import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AboutDialogComponent } from './about-dialog/about.component';
import { TranslocoModule } from '@ngneat/transloco';
import { env } from 'envs/env';
import { AuthSignInComponent } from './sign-in/component';
import { AuthSignInOTPComponent } from './sign-in-otp/component';
import { ResponseSignIn } from 'app/core/auth/auth.types';

@Component({
    standalone: true,
    styleUrl: './style.scss',
    templateUrl: 'template.html',
    imports: [
        CommonModule,
        MatIconModule,
        TranslocoModule,
        AuthSignInComponent,
        AuthSignInOTPComponent
    ],
})

export class AuthLayoutComponent{

    public go_to_verify_otp : boolean = false
    public email            : string =  ''
    public appVersion       : string  = env.APP_VERSION;

    constructor(
        private _matDialog: MatDialog,
    ) { }


    verifyOTP( data : ResponseSignIn ){
        this.email = data.email;
        this.go_to_verify_otp = data.go_to_verify_otp;
    }

    signIn( data : boolean ){
        this.go_to_verify_otp = data;
    }

    openAboutDialog(){
        this._matDialog.open(AboutDialogComponent, {
            autoFocus: false,
            position: { right: '0px' },
            height: '100dvh',
            width: '100dvw',
            maxWidth: '520px',
            panelClass: 'custom-mat-dialog-as-mat-drawer',
            enterAnimationDuration: '0s',
        })
    }
}
