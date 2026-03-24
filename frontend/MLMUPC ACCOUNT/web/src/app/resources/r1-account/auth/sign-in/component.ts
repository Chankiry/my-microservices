import { CommonModule }                  from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
    FormsModule, ReactiveFormsModule,
    UntypedFormBuilder, UntypedFormGroup, Validators,
} from '@angular/forms';
import { Router, RouterLink }            from '@angular/router';

import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatInputModule }           from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

import { TranslocoModule }          from '@ngneat/transloco';
import { helperAnimations }         from 'helper/animations';
import { SnackbarService }          from 'helper/services/snack-bar/snack-bar.service';
import GlobalConstants              from 'helper/shared/constants';
import { ErrorHandleService }       from 'app/shared/error-handle.service';
import { AuthService as CoreAuthService } from 'app/core/auth/auth.service';
import { ResourceAuthService, RedirectParams } from '../service';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import {
    SavedAccount,
    getSavedAccounts, saveAccount, removeAccount,
    setCurrentAccount, getCurrentAccountPhone,
} from '../saved-account.interface';
import { jwtDecode } from 'jwt-decode';

type ViewState =
    | 'account-picker'
    | 'password-confirm'
    | 'new-account'
    | 'link-connect';

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
        MatIconModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatDialogModule,
        TranslocoModule,
        RouterLink,
    ],
})
export class AuthSignInComponent implements OnInit {

    public viewState       : ViewState = 'new-account';
    public savedAccounts   : SavedAccount[] = [];
    public selectedAccount : SavedAccount | null = null;
    public redirectParams  : RedirectParams | null = null;

    public newAccountForm : UntypedFormGroup;
    public passwordForm   : UntypedFormGroup;
    public linkForm       : UntypedFormGroup;

    public isLoading    : boolean = false;
    public isRefreshing : boolean = false;
    public isLinking    : boolean = false;

    constructor(
        private _coreAuthService    : CoreAuthService,
        private _authService        : ResourceAuthService,
        private _formBuilder        : UntypedFormBuilder,
        private _router             : Router,
        private _snackBarService    : SnackbarService,
        private _errorHandleService : ErrorHandleService,
        private _dialog             : MatDialog,
    ) {}

    ngOnInit(): void {
        this.newAccountForm = this._formBuilder.group({
            phone   : ['', [Validators.required, Validators.minLength(7)]],
            password: ['', Validators.required],
        });
        this.passwordForm = this._formBuilder.group({
            password: ['', Validators.required],
        });
        this.linkForm = this._formBuilder.group({
            username: ['', Validators.required],
            password: ['', Validators.required],
        });

        // Check redirect params
        this.redirectParams = this._authService.readRedirectFromUrl();
        if (this.redirectParams) {
            this._authService.setPendingRedirect(this.redirectParams);
        }

        // action=link + already logged in → skip to link dialog
        if (this.redirectParams?.action === 'link' && this._coreAuthService.accessToken) {
            this.viewState = 'link-connect';
            return;
        }

        this._initView();
    }

    // ─── Init ─────────────────────────────────────────────────────────────────

    private _initView(): void {
        this.savedAccounts = getSavedAccounts();
        this.viewState = this.savedAccounts.length ? 'account-picker' : 'new-account';
    }

    // ─── Redirect helpers ─────────────────────────────────────────────────────

    get isRedirectMode(): boolean  { return !!this.redirectParams; }
    get isLinkMode(): boolean      { return this.redirectParams?.action === 'link'; }
    get redirectSystemName(): string { return this.redirectParams?.system_id || ''; }

    // ─── Account picker ───────────────────────────────────────────────────────

    async pickAccount(account: SavedAccount): Promise<void> {
        const currentPhone = getCurrentAccountPhone();
        const refreshToken = this._coreAuthService.refreshToken;
        const accessToken  = this._coreAuthService.accessToken;

        if (account.phone === currentPhone && accessToken) {
            try {
                const payload: any = jwtDecode(accessToken);
                if (payload.exp && payload.exp > Date.now() / 1000 + 30) {
                    this._afterLogin();
                    return;
                }
            } catch { /* fall through */ }
        }

        if (account.phone === currentPhone && refreshToken) {
            this.isRefreshing = true;
            try {
                await this._authService.refresh(refreshToken).toPromise();
                setCurrentAccount(account.phone);
                this._afterLogin();
                return;
            } catch { /* fall through */ }
            finally { this.isRefreshing = false; }
        }

        this.selectedAccount = account;
        this.passwordForm.reset();
        this.viewState = 'password-confirm';
    }

    useAnotherAccount(): void {
        this.newAccountForm.reset();
        this.viewState = 'new-account';
    }

    backToPicker(): void {
        this.selectedAccount = null;
        this.viewState = this.savedAccounts.length ? 'account-picker' : 'new-account';
    }

    removeAccount(account: SavedAccount, event: MouseEvent): void {
        event.stopPropagation();

        const dialogRef = this._dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
                title: 'ដកចេញគណនី',
                message: `តើលោកអ្នកពិតប្រាកដថាចង់ដកចេញគណនី ${account.name}?`,
                confirmLabel: 'ដកចេញ',
                cancelLabel: 'បោះបង់',
                confirmColor: 'warn',
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                removeAccount(account.phone);
                this.savedAccounts = getSavedAccounts();
                if (!this.savedAccounts.length) this.viewState = 'new-account';
                this._snackBarService.openSnackBar('គណនីត្រូវបានដកចេញ', GlobalConstants.success);
            }
        });
    }

    // ─── Login — new account ──────────────────────────────────────────────────

    signIn(): void {
        if (this.newAccountForm.invalid || this.isLoading) return;
        this.isLoading = true;
        this.newAccountForm.disable();

        const { phone, password } = this.newAccountForm.value;
        this._authService.login({ phone, password }).subscribe({
            next : res => this._saveAndProceed(res, phone),
            error: err => {
                this.isLoading = false;
                this.newAccountForm.enable();
                this._errorHandleService.handleHttpError(err);
            },
        });
    }

    // ─── Login — saved account password confirm ───────────────────────────────

    confirmPassword(): void {
        if (this.passwordForm.invalid || this.isLoading || !this.selectedAccount) return;
        this.isLoading = true;
        this.passwordForm.disable();

        this._authService.login({
            phone   : this.selectedAccount.phone,
            password: this.passwordForm.value.password,
        }).subscribe({
            next : res => this._saveAndProceed(res, this.selectedAccount!.phone),
            error: err => {
                this.isLoading = false;
                this.passwordForm.enable();
                this._errorHandleService.handleHttpError(err);
            },
        });
    }

    // ─── Link account (Phase 8) ───────────────────────────────────────────────

    linkAccount(): void {
        if (this.linkForm.invalid || this.isLinking || !this.redirectParams) return;
        this.isLinking = true;
        this.linkForm.disable();

        this._authService.redirectLink({
            system_id   : this.redirectParams.system_id,
            redirect_uri: this.redirectParams.redirect_uri,
            username    : this.linkForm.value.username,
            password    : this.linkForm.value.password,
        }).subscribe({
            next: res => {
                this._authService.clearPendingRedirect();
                this._snackBarService.openSnackBar('ភ្ជាប់គណនីបានជោគជ័យ', GlobalConstants.success);
                window.location.href = res.redirect_url;
            },
            error: err => {
                this.isLinking = false;
                this.linkForm.enable();
                this._errorHandleService.handleHttpError(err);
            },
        });
    }

    cancelLink(): void {
        this._authService.clearPendingRedirect();
        this._router.navigate(['/admin/dashboard']);
    }

    // ─── Post-login ───────────────────────────────────────────────────────────

    private _saveAndProceed(res: any, phone: string): void {
        try {
            const payload: any = jwtDecode(res.access_token);
            const name = [payload.given_name, payload.family_name].filter(Boolean).join(' ')
                      || payload.preferred_username || phone;
            saveAccount({ phone, name, email: payload.email || '', avatar: '', last_used: Date.now() });
        } catch {
            saveAccount({ phone, name: phone, email: '', avatar: '', last_used: Date.now() });
        }
        this._snackBarService.openSnackBar('ចូលប្រព័ន្ធជោគជ័យ', GlobalConstants.success);
        this._afterLogin();
    }

    private _afterLogin(): void {
        const pending = this._authService.getPendingRedirect();

        if (pending?.action === 'link') {
            this.viewState = 'link-connect';
            this.isLoading = false;
            return;
        }

        if (pending?.action === 'login') {
            this._authService.validateRedirect(pending).subscribe({
                next: res => {
                    this._authService.clearPendingRedirect();
                    window.location.href = res.redirect_url;
                },
                error: err => {
                    this.isLoading = false;
                    this._errorHandleService.handleHttpError(err);
                },
            });
            return;
        }

        this._router.navigate(['/admin/dashboard']);
    }

    onEnterKeyPress(event: KeyboardEvent): void {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        if (this.viewState === 'new-account')      this.signIn();
        if (this.viewState === 'password-confirm') this.confirmPassword();
        if (this.viewState === 'link-connect')     this.linkAccount();
    }
}
