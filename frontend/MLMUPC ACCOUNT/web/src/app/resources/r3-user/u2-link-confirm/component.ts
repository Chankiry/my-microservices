import {
    Component, OnInit, OnDestroy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule }     from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, interval, takeUntil, takeWhile } from 'rxjs';
import { switchMap }        from 'rxjs/operators';

import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserHomeService }      from '../u1-home/service';
import { SnackbarService }      from 'helper/services/snack-bar/snack-bar.service';
import { ErrorHandleService }   from 'app/shared/error-handle.service';
import { LinkSessionInfo }      from '../u1-home/user-home.types';
import GlobalConstants           from 'helper/shared/constants';
import { env }                  from 'envs/env';

type PageState = 'loading' | 'awaiting_service' | 'awaiting_user' | 'confirming' | 'error';

@Component({
    selector   : 'user-link-confirm',
    templateUrl: './template.html',
    standalone : true,
    imports    : [
        CommonModule,
        MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    ],
})
export class LinkConfirmComponent implements OnInit, OnDestroy {

    public state      : PageState        = 'loading';
    public session    : LinkSessionInfo | null = null;
    public errorMsg   : string           = '';
    public file_url                      = env.FILE_BASE_URL;

    private _code     : string           = '';
    private _destroy$ = new Subject<void>();

    // Auto-poll: check every 3s whether PLT has called /auth/link/notify
    private readonly POLL_INTERVAL_MS = 3_000;
    private readonly POLL_MAX_ATTEMPTS = 40;   // 2 min max
    private _pollAttempts = 0;

    constructor(
        private _route       : ActivatedRoute,
        private _router      : Router,
        private _service     : UserHomeService,
        private _snackBar    : SnackbarService,
        private _errorHandle : ErrorHandleService,
        private _cdr         : ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this._code = this._route.snapshot.queryParamMap.get('code') ?? '';

        if (!this._code) {
            this.state    = 'error';
            this.errorMsg = 'កូដភ្ជាប់មិនត្រឹមត្រូវ';
            this._cdr.markForCheck();
            return;
        }

        this._loadSession();
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    // ─── Load session info ────────────────────────────────────────────────────

    private _loadSession(): void {
        this.state = 'loading';
        this._cdr.markForCheck();

        this._service.getLinkSession(this._code).subscribe({
            next: res => {
                this.session = res.data;
                this.state   = res.data.step;

                if (res.data.step === 'awaiting_service') {
                    this._startPolling();
                }
                this._cdr.markForCheck();
            },
            error: err => {
                this.state    = 'error';
                this.errorMsg = err?.error?.error ?? 'សម័យភ្ជាប់មិនមាន ឬ បានផុតកំណត់';
                this._cdr.markForCheck();
            },
        });
    }

    // ─── Auto-poll until step becomes awaiting_user ───────────────────────────
    // PLT calls POST /auth/link/notify server-side; we poll to detect it.

    private _startPolling(): void {
        this._pollAttempts = 0;

        interval(this.POLL_INTERVAL_MS).pipe(
            takeUntil(this._destroy$),
            takeWhile(() => this.state === 'awaiting_service' && this._pollAttempts < this.POLL_MAX_ATTEMPTS),
            switchMap(() => {
                this._pollAttempts++;
                return this._service.getLinkSession(this._code);
            }),
        ).subscribe({
            next: res => {
                this.session = res.data;
                if (res.data.step === 'awaiting_user') {
                    this.state = 'awaiting_user';
                }
                this._cdr.markForCheck();
            },
            error: () => {
                // Session expired or error — stop polling silently
                this.state    = 'error';
                this.errorMsg = 'សម័យភ្ជាប់មិនមាន ឬ បានផុតកំណត់';
                this._cdr.markForCheck();
            },
        });
    }

    // ─── Manual refresh ───────────────────────────────────────────────────────

    refresh(): void {
        this._loadSession();
    }

    // ─── Confirm link ─────────────────────────────────────────────────────────

    confirm(): void {
        if (this.state !== 'awaiting_user') return;
        this.state = 'confirming';
        this._cdr.markForCheck();

        this._service.linkConfirm(this._code).subscribe({
            next: res => {
                this._snackBar.openSnackBar(
                    { name_kh: 'ភ្ជាប់ប្រព័ន្ធបានជោគជ័យ', name_en: 'System linked successfully' },
                    GlobalConstants.success,
                );
                // Navigate to the redirect_path returned by the backend
                const path = res.data?.redirect_path ?? '/user/home';
                this._router.navigateByUrl(path);
            },
            error: err => {
                this.state = 'awaiting_user';
                this._errorHandle.handleHttpError(err);
                this._cdr.markForCheck();
            },
        });
    }

    // ─── Cancel / back ────────────────────────────────────────────────────────

    cancel(): void {
        this._router.navigateByUrl('/user/home');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    getLogoUrl(): string {
        const logo = this.session?.system?.logo;
        if (!logo) return '/images/placeholder/avatar.jpg';
        if (logo.startsWith('images/') || logo.startsWith('http')) return logo;
        return `${this.file_url}/${logo}`;
    }

    get expiresInSeconds(): number {
        if (!this.session) return 0;
        return Math.max(0, this.session.expires_at - Math.floor(Date.now() / 1000));
    }
}
