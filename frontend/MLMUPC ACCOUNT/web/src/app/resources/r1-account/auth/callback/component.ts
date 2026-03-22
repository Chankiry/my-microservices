import { Component, OnInit }    from '@angular/core';
import { CommonModule }         from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient }           from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService }          from 'app/core/auth/auth.service';
import { SnackbarService }      from 'helper/services/snack-bar/snack-bar.service';
import GlobalConstants          from 'helper/shared/constants';

@Component({
    standalone: true,
    imports   : [CommonModule, MatProgressSpinnerModule],
    template  : `
        <div class="w-full h-[100dvh] flex items-center justify-center">
            <mat-progress-spinner [diameter]="48" [mode]="'indeterminate'" />
        </div>
    `,
})
export class AuthCallbackComponent implements OnInit {

    private readonly tokenUrl =
        'http://localhost:8000/api/v1/account/auth/login/keycloak/callback';

    constructor(
        private _route       : ActivatedRoute,
        private _router      : Router,
        private _http        : HttpClient,
        private _authService : AuthService,
        private _snackBar    : SnackbarService,
    ) {}

    ngOnInit(): void {
        console.log('=== CALLBACK COMPONENT LOADED ===');
        console.log('Full URL:', window.location.href);

        // With hash routing, params are after the # in format:
        // http://localhost:4444/#/auth/callback?code=xxx&state=yyy
        // We need to parse the hash portion manually
        const hash    = window.location.hash;  // "#/auth/callback?code=xxx"
        const search  = hash.includes('?') ? hash.substring(hash.indexOf('?')) : '';
        const params  = new URLSearchParams(search);

        const code    = params.get('code');
        const error   = params.get('error');

        console.log('Parsed code:', code);
        console.log('Parsed error:', error);

        if (error) {
            this._snackBar.openSnackBar('ការចូលប្រព័ន្ធបានបរាជ័យ', 'error');
            this._router.navigate(['/auth']);
            return;
        }

        if (!code) {
            this._router.navigate(['/auth']);
            return;
        }

        this._http.post<{
            access_token : string;
            refresh_token: string;
            expires_in   : number;
            token_type   : string;
        }>(`http://localhost:8000/api/v1/account/auth/login/keycloak/callback`, { code }).subscribe({
            next: res => {
                console.log('Received tokens:', res);
                this._authService.accessToken  = res.access_token;
                this._authService.refreshToken = res.refresh_token;
                this._snackBar.openSnackBar('ចូលប្រព័ន្ធជោគជ័យ', GlobalConstants.success);
                this._router.navigate(['/admin/home']);
            },
            error: () => {
                this._snackBar.openSnackBar('ការចូលប្រព័ន្ធបានបរាជ័យ', 'error');
                this._router.navigate(['/auth']);
            },
        });
    }
}
