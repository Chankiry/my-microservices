import { CommonModule }                                                                               from '@angular/common';
import { Component, OnInit, ViewEncapsulation }                                                       from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators }         from '@angular/forms';
import { Router, RouterLink }                                                                         from '@angular/router';
import { HttpClient }                                                                                 from '@angular/common/http';

import { MatButtonModule }           from '@angular/material/button';
import { MatIconModule }             from '@angular/material/icon';
import { MatInputModule }            from '@angular/material/input';
import { MatProgressSpinnerModule }  from '@angular/material/progress-spinner';
import { MatFormFieldModule }        from '@angular/material/form-field';

import { TranslocoModule }           from '@ngneat/transloco';
import { helperAnimations }          from 'helper/animations';
import { SnackbarService }           from 'helper/services/snack-bar/snack-bar.service';
import GlobalConstants               from 'helper/shared/constants';
import { ErrorHandleService }        from 'app/shared/error-handle.service';
import { env }                       from 'envs/env';
import { LanguagesComponent }        from 'app/layout/common/languages/languages.component';

@Component({
    selector      : 'auth-platform-sign-in',
    templateUrl   : './template.html',
    styleUrl      : './style.scss',
    encapsulation : ViewEncapsulation.None,
    animations    : helperAnimations,
    standalone    : true,
    imports       : [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        TranslocoModule,
        LanguagesComponent,
        RouterLink,
    ],
})
export class AuthPlatformSignInComponent implements OnInit {

    public form: any;

    // Platform login endpoint — user-service via Kong
    private readonly platformLoginUrl = `${env.API_BASE_URL}/api/v1/account/auth/login`;

    constructor(
        private _formBuilder        : UntypedFormBuilder,
        private _router             : Router,
        private _http               : HttpClient,
        private _snackBarService    : SnackbarService,
        private _errorHandleService : ErrorHandleService,
    ) {}

    ngOnInit(): void {
        this.form = this._formBuilder.group({
            phone   : ['', [Validators.required, Validators.minLength(7)]],
            password: ['', Validators.required],
        });
    }

    onEnterKeyPress(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.signIn();
        }
    }

    signIn(): void {
        if (this.form.disabled || this.form.invalid) return;

        this.form.disable();

        this._http.post<{
            access_token : string;
            refresh_token: string;
            expires_in   : number;
            token_type   : string;
        }>(this.platformLoginUrl, {
            phone   : this.form.value.phone,
            password: this.form.value.password,
        }).subscribe({
            next: res => {
                console.log(res);
                // Store tokens using the same keys PLT uses
                // so all existing API calls work unchanged
                localStorage.setItem('accessToken',  res.access_token);
                localStorage.setItem('refreshToken', res.refresh_token);
                localStorage.setItem('tokenType',    res.token_type);
                localStorage.setItem('expiresAt',    String(Date.now() + res.expires_in * 1000));

                this._snackBarService.openSnackBar('ចូលប្រព័ន្ធជោគជ័យ', GlobalConstants.success);
                this._router.navigate(['/']);
            },
            error: err => {
                this.form.enable();
                this._errorHandleService.handleHttpError(err);
            },
        });
    }

    goBack(): void {
        this._router.navigate(['/auth']);
    }
}
