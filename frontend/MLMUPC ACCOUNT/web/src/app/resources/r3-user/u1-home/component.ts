import { CommonModule }               from '@angular/common';
import {
    Component, OnInit, OnDestroy,
    ChangeDetectorRef, ViewEncapsulation,
} from '@angular/core';
import { Subject, takeUntil }           from 'rxjs';

import { MatButtonModule }              from '@angular/material/button';
import { MatIconModule }                from '@angular/material/icon';
import { MatProgressSpinnerModule }     from '@angular/material/progress-spinner';
import { MatDividerModule }             from '@angular/material/divider';
import { MatDialog, MatDialogModule }   from '@angular/material/dialog';
import { MatTooltipModule }             from '@angular/material/tooltip';
import { MatMenuModule }                from '@angular/material/menu';
import { TranslocoModule }              from '@ngneat/transloco';

import { UserHomeService }              from './service';
import { SnackbarService }              from 'helper/services/snack-bar/snack-bar.service';
import { ErrorHandleService }           from 'app/shared/error-handle.service';
import GlobalConstants                  from 'helper/shared/constants';
import { env }                          from 'envs/env';

import { ProfileResponse, SystemAccessItem, AvailableSystem } from './user-home.types';

// ─── Dialog imports ───────────────────────────────────────────────────────────
import { ConnectSystemDialogComponent }    from './dialogs/connect-system/component';
import { DisconnectConfirmDialogComponent } from './dialogs/disconnect-confirm/component';
import { ChangePasswordDialogComponent }   from './dialogs/change-password/component';
import { EditProfileDialogComponent }      from './dialogs/edit-profile/component';

@Component({
    selector     : 'user-home',
    templateUrl  : './template.html',
    styleUrl     : './style.scss',
    encapsulation: ViewEncapsulation.None,
    standalone   : true,
    imports      : [
        CommonModule,
        MatButtonModule, MatIconModule, MatProgressSpinnerModule,
        MatDividerModule, MatDialogModule, MatTooltipModule, MatMenuModule,
        TranslocoModule,
    ],
})
export class UserHomeComponent implements OnInit, OnDestroy {

    // ─── Data ─────────────────────────────────────────────────────────────────
    public data             : ProfileResponse | null = null;
    public availableSystems : AvailableSystem[]      = [];
    public isLoading        : boolean                = true;

    // ─── Per-card loading states ──────────────────────────────────────────────
    public navigatingSystemId: string | null = null;
    public linkingSystemId   : string | null = null;

    // ─── Assets / fallbacks ───────────────────────────────────────────────────
    public file_url         = env.FILE_BASE_URL;
    public backgroundImage  = 'images/background/background-side.JPG';
    public avatar           = 'images/avatars/avatar.jpeg';
    public profileName      = '';

    public services: any[] = [
        {
            title      : 'ព័ត៌មានផ្ទាល់ខ្លួន',
            description: 'គ្រប់គ្រងនិងធ្វើបច្ចុប្បន្នភាពព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នក',
            icon       : 'mdi:account-circle',
            color      : '#0C7EA5',
        },
        {
            title      : 'គណនីសុវិត្ថិភាពខ្ពស់!',
            description: 'យើងបានពិនិត្យឃើញថាលោកអ្នកបានបំពេញលក្ខណសុវត្តិភាព',
            icon       : 'mdi:shield-check',
            color      : '#0DA487',
        },
        {
            title      : 'ចូលគណនីដោយប្រើ QR',
            description: 'បង្កើត QR ដើម្បីចូលប្រើប្រាស់កម្មវិធីទូរស័ព្ទដៃ',
            icon       : 'mdi:qrcode',
            color      : '#DDAD01',
        },
    ];

    public devices: any[] = [
        { name: 'Window',    model: 'ខ្ចាស់អក្សរ, ក្រុម', carrier: 'Express, CIS', status: 'active' },
        { name: 'iPhone 16', model: 'ខ្ចាស់អក្សរ, ក្រុម', carrier: 'LR, PSS',      count: '5 ឧបករណ៍', status: 'active' },
        { name: 'iPad',      model: 'ខ្ចាស់អក្សរ, ក្រុម', carrier: 'Express, CIS', count: '1 ឧបករណ៍', status: 'active' },
    ];

    // Getter — keeps the template's *ngFor="let system of systems" working
    get systems(): SystemAccessItem[] {
        return this.data?.system_accesses ?? [];
    }

    private _unsubscribeAll = new Subject<any>();

    constructor(
        private _service            : UserHomeService,
        private _snackBarService    : SnackbarService,
        private _errorHandleService : ErrorHandleService,
        private _changeDetectorRef  : ChangeDetectorRef,
        private _dialog             : MatDialog,
    ) {}

    ngOnInit(): void {
        this.getData();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // ─── Load ─────────────────────────────────────────────────────────────────

    private getData(): void {
        this.isLoading = true;
        this._service.getProfile()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: res => {
                    this.data = res.data;
                    if (this.data.avatar) this.avatar = this.getSystemLogoUrl(this.data.avatar);
                    if (this.data.cover)  this.backgroundImage = `${this.file_url}/${this.data.cover}`;
                    if (!this.data.name_kh && !this.data.name_en) {
                        this.profileName = [this.data.first_name, this.data.last_name]
                            .filter(Boolean).join(' ') || this.data.phone;
                    }
                    this.isLoading = false;
                    this._loadAvailableSystems();
                    this._changeDetectorRef.markForCheck();
                },
                error: err => {
                    this.isLoading = false;
                    this._errorHandleService.handleHttpError(err);
                    this._changeDetectorRef.markForCheck();
                },
            });
    }

    private _loadAvailableSystems(): void {
        this._service.getAvailableSystems()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next : res => {
                    this.availableSystems = res.data;
                    this._changeDetectorRef.markForCheck();
                },
                error: () => { /* silent */ },
            });
    }

    // ─── Connect dialog ───────────────────────────────────────────────────────

    openConnectDialog(system: AvailableSystem): void {
        const ref = this._dialog.open(ConnectSystemDialogComponent, {
            data      : system,
            autoFocus : false,
            panelClass: 'dialog-no-padding',
        });
        ref.afterClosed().subscribe(connected => {
            if (connected) this.getData();
        });
    }

    // ─── Disconnect confirm dialog ────────────────────────────────────────────

    openDisconnectDialog(system: SystemAccessItem): void {
        const ref = this._dialog.open(DisconnectConfirmDialogComponent, {
            data      : system,
            autoFocus : false,
            panelClass: 'dialog-no-padding',
        });
        ref.afterClosed().subscribe(disconnected => {
            if (disconnected) this.getData();
        });
    }

    // ─── Change password dialog ───────────────────────────────────────────────

    openChangePasswordDialog(): void {
        this._dialog.open(ChangePasswordDialogComponent, {
            autoFocus : false,
            panelClass: 'dialog-no-padding',
        });
        // No reload needed — password change doesn't affect displayed data
    }

    // ─── Edit profile dialog ──────────────────────────────────────────────────

    openEditProfileDialog(): void {
        const ref = this._dialog.open(EditProfileDialogComponent, {
            data      : this.data,
            autoFocus : false,
            panelClass: 'dialog-no-padding',
        });
        ref.afterClosed().subscribe(updated => {
            if (updated) this.getData();
        });
    }

    // ─── SSO Navigate ─────────────────────────────────────────────────────────

    navigateToSystem(system: SystemAccessItem): void {
        if (system.registration_status !== 'active') return;
        if (this.navigatingSystemId) return;

        this.navigatingSystemId = system.id;
        this._changeDetectorRef.markForCheck();

        this._service.ssoNavigate(system.id).subscribe({
            next: res => {
                this.navigatingSystemId = null;
                window.open(res.data.url, '_blank');
                this._changeDetectorRef.markForCheck();
            },
            error: err => {
                this.navigatingSystemId = null;
                this._errorHandleService.handleHttpError(err);
                this._changeDetectorRef.markForCheck();
            },
        });
    }

    // ─── Link Initiate ────────────────────────────────────────────────────────

    linkSystem(system: AvailableSystem): void {
        if (this.linkingSystemId) return;
        this.linkingSystemId = system.id;
        this._changeDetectorRef.markForCheck();

        this._service.linkInitiate(system.id).subscribe({
            next: res => {
                this.linkingSystemId = null;
                window.open(res.data.redirect_url, '_blank');
                this._changeDetectorRef.markForCheck();
            },
            error: err => {
                this.linkingSystemId = null;
                this._errorHandleService.handleHttpError(err);
                this._changeDetectorRef.markForCheck();
            },
        });
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    getFullName(): string {
        if (!this.data) return '';
        return [this.data.first_name, this.data.last_name].filter(Boolean).join(' ') || this.data.phone;
    }

    getAvatarUrl(): string {
        return this.data?.avatar ? this.getSystemLogoUrl(this.data.avatar) : '/images/placeholder/avatar.jpg';
    }

    getStatusColor(status: string): string {
        const map: Record<string, string> = {
            active   : 'bg-green-100 text-green-700',
            pending  : 'bg-yellow-100 text-yellow-700',
            suspended: 'bg-red-100 text-red-700',
            rejected : 'bg-gray-100 text-gray-500',
        };
        return map[status] ?? 'bg-gray-100 text-gray-500';
    }

    getStatusLabel(status: string): string {
        const map: Record<string, string> = {
            active   : 'សកម្ម',
            pending  : 'រង់ចាំ',
            suspended: 'ផ្អាក',
            rejected : 'បដិសេធ',
        };
        return map[status] ?? status;
    }

    activeSystemCount(): number {
        return this.data?.system_accesses?.filter(s => s.registration_status === 'active').length ?? 0;
    }

    getSystemLogoUrl(logo: string | null): string {
        if (!logo) return '/images/placeholder/avatar.jpg';
        if (logo.startsWith('images/') || logo.startsWith('http')) return logo;
        return `${this.file_url}/${logo}`;
    }
}
