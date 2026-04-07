import { CommonModule }                 from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil }           from 'rxjs';

import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule }         from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatTooltipModule }         from '@angular/material/tooltip';

import { UserHomeService } from './service';
import { SnackbarService }          from 'helper/services/snack-bar/snack-bar.service';
import { ErrorHandleService }       from 'app/shared/error-handle.service';
import GlobalConstants              from 'helper/shared/constants';
import { env }                      from 'envs/env';
import { TranslocoModule } from '@ngneat/transloco';
import { MatMenuModule } from '@angular/material/menu';
import { SystemAccess, SystemInfo } from 'app/resources/r1-account/profile/service';

@Component({
    selector     : 'user-home',
    templateUrl  : './template.html',
    styleUrl     : './style.scss',
    encapsulation: ViewEncapsulation.None,
    standalone   : true,
    imports      : [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatDividerModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule,
        TranslocoModule,
        MatMenuModule,
    ],
})
export class UserHomeComponent implements OnInit, OnDestroy {

    public data          : any | null = null;
    public availableSystems = [];
    public isLoading        : boolean = true;

    // Connect dialog state
    public showConnectDialog : boolean = false;
    public connectingSystem = null;
    public connectForm       : UntypedFormGroup;
    public isConnecting      : boolean = false;

    // Disconnect state
    public disconnectingId  : string | null = null;

    public file_url = env.FILE_BASE_URL;
    private _unsubscribeAll = new Subject<any>();
    public current_lang     : string;


    backgroundImage = 'images/background/background-side.JPG';
    avatar = 'images/avatars/avatar.jpeg';

    profileName = '';

    phone = '099 888 777';
    email = 'kak.soky@gmail.com';

    services: any[] = [
      {
        title: 'ព័ត៌មានផ្ទាល់ខ្លួន',
        description: 'គ្រប់គ្រងនិងធ្វើបច្ចុប្បន្នភាពព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នក',
        icon: 'mdi:account-circle',
        color: '#0C7EA5'
      },
      {
        title: 'គណនីសុវិត្ថិភាពខ្ពស់!',
        description: 'យើងបានពិនិត្យឃើញថាលោកអ្នកបានបំពេញលក្ខណសុវត្តិភាព បានយើងត្រឹមត្រូវ',
        icon: 'mdi:shield-check',
        color: '#0DA487'
      },
      {
        title: 'ចូលគណនីដោយប្រើ QR',
        description: 'បង្កើត QR ដើម្បីចូលប្រើប្រាស់កម្មវិធីទូរស័ព្ទដៃ',
        icon: 'mdi:qrcode',
        color: '#DDAD01'
      }
    ];

    systems: any[] = [];

    devices: any[] = [
      {
        name: 'Window',
        model: 'ខ្ចាស់អក្សរ, ក្រុម',
        carrier: 'Express, CIS',
        status: 'active'
      },
      {
        name: 'iPhone 16',
        model: 'ខ្ចាស់អក្សរ, ក្រុម',
        carrier: 'LR, PSS',
        count: '5 ឧបករណ៍',
        status: 'active'
      },
      {
        name: 'iPad',
        model: 'ខ្ចាស់អក្សរ, ក្រុម',
        carrier: 'Express, CIS',
        count: '1 ឧបករណ៍',
        status: 'active'
      }
    ];

    constructor(
        private _service            : UserHomeService,
        private _snackBarService    : SnackbarService,
        private _errorHandleService : ErrorHandleService,
        private _changeDetectorRef  : ChangeDetectorRef,
        private _formBuilder        : UntypedFormBuilder,
    ) {}

    ngOnInit(): void {
        this.connectForm = this._formBuilder.group({
            username: ['', Validators.required],
            password: ['', Validators.required],
        });
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
                  this.data   = res.data;
                  this.systems = this.data?.system_accesses || [];
                  if(!this.data.name_kh && !this.data.name_en) this.profileName = this.data.first_name + ' ' + this.data.last_name;
                  if(this.data.avatar) this.avatar = `${this.file_url}/${this.data.avatar}`;
                  if(this.data.cover) this.backgroundImage = `${this.file_url}/${this.data.cover}`;
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
                next: res => {
                    this.availableSystems = res.data;
                    this._changeDetectorRef.markForCheck();
                },
                error: () => {} // silent
            });
    }

    // ─── Connect dialog ───────────────────────────────────────────────────────

    openConnectDialog(system: SystemInfo): void {
        this.connectingSystem = system;
        this.connectForm.reset();
        this.showConnectDialog = true;
    }

    closeConnectDialog(): void {
        this.showConnectDialog = false;
        this.connectingSystem  = null;
        this.isConnecting      = false;
        this.connectForm.reset();
    }

    connect(): void {
        if (this.connectForm.invalid || this.isConnecting || !this.connectingSystem) return;

        this.isConnecting = true;
        this.connectForm.disable();

        this._service.connectSystem({
            system_id: this.connectingSystem.id,
            username : this.connectForm.value.username,
            password : this.connectForm.value.password,
        }).subscribe({
            next: res => {
                this._snackBarService.openSnackBar(res.message, GlobalConstants.success);
                this.closeConnectDialog();
                this.getData();
            },
            error: err => {
                this.isConnecting = false;
                this.connectForm.enable();
                this._errorHandleService.handleHttpError(err);
                this._changeDetectorRef.markForCheck();
            },
        });
    }

    // ─── Disconnect ───────────────────────────────────────────────────────────

    disconnect(access: SystemAccess): void {
        if (this.disconnectingId) return;
        this.disconnectingId = access.system_id;
        this._changeDetectorRef.markForCheck();

        this._service.disconnectSystem(access.system_id).subscribe({
            next: res => {
                this._snackBarService.openSnackBar(res.message.name_kh, GlobalConstants.success);
                this.disconnectingId = null;
                this.getData();
            },
            error: err => {
                this.disconnectingId = null;
                this._errorHandleService.handleHttpError(err);
                this._changeDetectorRef.markForCheck();
            },
        });
    }

    // ─── Navigate to system ───────────────────────────────────────────────────

    navigateToSystem(access: SystemAccess): void {
        if (access.registration_status !== 'active') return;
        // Phase 5 — SSO navigate
        console.log('Navigate to system:', access.system_id);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    getFullName(): string {
        if (!this.data) return '';
        return `${this.data.first_name || ''} ${this.data.last_name || ''}`.trim()
            || this.data.phone;
    }

    getAvatarUrl(): string {
        if (this.data?.avatar_uri) return `${this.file_url}/${this.data.avatar_uri}`;
        return '/images/placeholder/avatar.jpg';
    }

    getStatusColor(status: string): string {
        const map: Record<string, string> = {
            active   : 'bg-green-100 text-green-700',
            pending  : 'bg-yellow-100 text-yellow-700',
            suspended: 'bg-red-100 text-red-700',
            rejected : 'bg-gray-100 text-gray-500',
        };
        return map[status] || 'bg-gray-100 text-gray-500';
    }

    getStatusLabel(status: string): string {
        const map: Record<string, string> = {
            active   : 'សកម្ម',
            pending  : 'រង់ចាំ',
            suspended: 'ផ្អាក',
            rejected : 'បដិសេធ',
        };
        return map[status] || status;
    }

    activeSystemCount(): number {
        return this.data?.system_access?.filter(
            s => s.registration_status === 'active'
        ).length || 0;
    }

    getSystemLogoUrl(logo: string | null): string | null {
      if(logo.startsWith('images/')) {
        return logo; // Local asset
      }
      else{
        return `${this.file_url}/${logo}`; // Remote file
      }
    }

}
