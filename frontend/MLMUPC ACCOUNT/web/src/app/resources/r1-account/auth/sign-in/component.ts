// ================================================================================>> Main Library
import { CommonModule }                                                                               from '@angular/common';
import { Component, EventEmitter, OnInit, Output, ViewChild, ViewEncapsulation }                      from '@angular/core';
import { FormsModule, NgForm, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router, RouterLink }                                                                         from '@angular/router';

// ================================================================================>> Third Party Library
// ===>> Material
import { MatButtonModule }                                                                            from '@angular/material/button';
import { MatCheckboxModule }                                                                          from '@angular/material/checkbox';
import { MatIconModule }                                                                              from '@angular/material/icon';
import { MatInputModule }                                                                             from '@angular/material/input';
import { MatProgressSpinnerModule }                                                                   from '@angular/material/progress-spinner';
import { MatFormFieldModule }                                                                         from '@angular/material/form-field';
import { MatDialog, MatDialogConfig, MatDialogModule }                                                from '@angular/material/dialog';

// ===>> Transloco
import { TranslocoModule }                                                                            from '@ngneat/transloco';

// ================================================================================>> Custom Library
// ===>> Env
import { env }                                                                                        from 'envs/env';

// ===>> Helper Library
import { helperAnimations }                                                                           from 'helper/animations';
import { SnackbarService }                                                                            from 'helper/services/snack-bar/snack-bar.service';
import GlobalConstants                                                                                from 'helper/shared/constants';

// ===>> Shared
import { ErrorHandleService }                                                                         from 'app/shared/error-handle.service';

// ===>> Service
import { AuthService }                                                                                from 'app/core/auth/auth.service';

// ===>> Locals
import { LanguagesComponent }                                                                         from 'app/layout/common/languages/languages.component';
import { ResponseSignIn } from 'app/core/auth/auth.types';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';

@Component({
    selector      : 'auth-sign-in',
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
        MatDialogModule,
        MatIconModule,
        MatCheckboxModule,
        MatProgressSpinnerModule,
        MatDividerModule,
        TranslocoModule,
        LanguagesComponent,
        RouterLink,
    ],
})
export class AuthSignInComponent implements OnInit {

    public form         : UntypedFormGroup;
    public platformForm : UntypedFormGroup;

    // Which form is shown — 'plt' (default) or 'platform'
    public activeTab: 'plt' | 'platform' = 'platform';

    @Output() updateChange = new EventEmitter<ResponseSignIn>();

    private readonly platformLoginUrl = `http://localhost:8000/api/v1/account/auth/login`;

    constructor(
        private _authService        : AuthService,
        private _formBuilder        : UntypedFormBuilder,
        private _router             : Router,
        private _http               : HttpClient,
        private _errorHandleService : ErrorHandleService,
        private _snackBarService    : SnackbarService,
    ) {}

    ngOnInit(): void {
        // PLT login form
        this.form = this._formBuilder.group({
            username: ['', Validators.required],
            password: ['', Validators.required],
        });

        // Platform login form
        this.platformForm = this._formBuilder.group({
            phone   : ['087600063', [Validators.required, Validators.minLength(7)]],
            password: ['admin123', Validators.required],
        });
    }

    switchTab(tab: 'plt' | 'platform'): void {
        this.activeTab = tab;
    }

    onEnterKeyPress(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.activeTab === 'plt' ? this.signIn() : this.platformSignIn();
        }
    }

    // ─── PLT login (existing) ─────────────────────────────────────────────────

    signIn(): void {
        if (this.form.disabled || this.form.invalid) return;

        this.form.disable();

        this._authService.signIn(this.form.value).subscribe({
            next: res => {
                this.updateChange.emit(res);
                this._snackBarService.openSnackBar(res.message, GlobalConstants.success);
            },
            error: err => {
                this.form.enable();
                this._errorHandleService.handleHttpError(err);
            },
        });
    }

    // ─── Platform login (new) ─────────────────────────────────────────────────

    platformSignIn(): void {
        if (this.platformForm.disabled || this.platformForm.invalid) return;

        this.platformForm.disable();

        this._http.post<{
            access_token : string;
            refresh_token: string;
            expires_in   : number;
            token_type   : string;
        }>(this.platformLoginUrl, {
            phone   : this.platformForm.value.phone,
            password: this.platformForm.value.password,
        }).subscribe({
            next: res => {
                this._authService.accessToken  = res.access_token;
                this._authService.refreshToken = res.refresh_token;
                this._snackBarService.openSnackBar('ចូលប្រព័ន្ធជោគជ័យ', GlobalConstants.success);
                this._router.navigate(['/admin/home']);
            },
            error: err => {
                this.platformForm.enable();
                this._errorHandleService.handleHttpError(err);
            },
        });
    }

private readonly keycloakLoginUrl =
    `http://localhost:8080/realms/microservices-platform/protocol/openid-connect/auth` +
    `?client_id=kong-gateway` +
    `&redirect_uri=http://localhost:4444/callback` +
    `&response_type=code` +
    `&scope=openid%20profile%20email`;
    // `&prompt=login`;  // ← add this

    loginWithKeycloak(): void {
        window.location.href = this.keycloakLoginUrl;
    }
}
