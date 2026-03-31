import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router }                       from '@angular/router';
import { AuthService }                  from 'app/core/auth/auth.service';

@Component({
    standalone : true,
    selector   : 'service-down',
    template   : `
    <div class="w-full h-[100dvh] flex flex-col items-center justify-center gap-6 bg-slate-50">

        <div class="flex flex-col items-center gap-3 text-center px-6">
            <div class="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                <svg class="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
            </div>

            <h1 class="text-2xl font-semibold text-slate-800">សេវាកម្មមិនអាចប្រើបានពេលនេះ</h1>
            <p class="text-slate-500 max-w-sm">
                Service is currently unavailable. Please wait a moment and try again.
            </p>

            <div class="flex items-center gap-2 text-sm text-slate-400 mt-2" *ngIf="countdown > 0">
                <span>Retrying in</span>
                <span class="font-mono font-medium text-slate-600">{{ countdown }}s</span>
            </div>
        </div>

        <div class="flex gap-3">
            <button
                (click)="retry()"
                class="px-6 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity">
                ព្យាយាមម្តងទៀត
            </button>
            <button
                (click)="signOut()"
                class="px-6 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors">
                ចេញ
            </button>
        </div>

    </div>
    `,
    imports: [],
})
export class ServiceDownComponent implements OnInit, OnDestroy {

    public countdown = 30;
    private _interval: any;

    constructor(
        private _router     : Router,
        private _authService: AuthService,
    ) {}

    ngOnInit(): void {
        // Auto-retry after 30 seconds — user does not need to click
        this._interval = setInterval(() => {
            this.countdown--;
            if (this.countdown <= 0) {
                this.retry();
            }
        }, 1000);
    }

    ngOnDestroy(): void {
        clearInterval(this._interval);
    }

    retry(): void {
        clearInterval(this._interval);
        // Navigate back to root — resolver will re-attempt /me
        this._router.navigateByUrl('');
    }

    signOut(): void {
        clearInterval(this._interval);
        this._authService.accessToken  = '';
        this._authService.refreshToken = '';
        this._router.navigateByUrl('/auth');
    }
}
