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

import { ProfileResourceService, UserProfile, SystemAccess, SystemInfo } from './service';
import { SnackbarService }          from 'helper/services/snack-bar/snack-bar.service';
import { ErrorHandleService }       from 'app/shared/error-handle.service';
import GlobalConstants              from 'helper/shared/constants';
import { env }                      from 'envs/env';
import { TranslocoModule } from '@ngneat/transloco';
import { MatMenuModule } from '@angular/material/menu';

@Component({
    selector     : 'profile-page',
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
export class ProfileComponent implements OnInit, OnDestroy {

    public data          : UserProfile | null = null;
    public availableSystems : SystemInfo[]        = [];
    public isLoading        : boolean = true;

    // Connect dialog state
    public showConnectDialog : boolean = false;
    public connectingSystem  : SystemInfo | null = null;
    public connectForm       : UntypedFormGroup;
    public isConnecting      : boolean = false;

    // Disconnect state
    public disconnectingId  : string | null = null;

    public FILE_URL = env.FILE_BASE_URL;
    private _unsubscribeAll = new Subject<any>();

    constructor(
        private _profileService     : ProfileResourceService,
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
        this._loadProfile();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // ─── Load ─────────────────────────────────────────────────────────────────

    private _loadProfile(): void {
        this.isLoading = true;
        this._profileService.getProfile()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: res => {
                  this.data   = res;
                  console.log(this.data);
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
        this._profileService.getAvailableSystems()
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

        this._profileService.connectSystem({
            system_id: this.connectingSystem.id,
            username : this.connectForm.value.username,
            password : this.connectForm.value.password,
        }).subscribe({
            next: () => {
                this._snackBarService.openSnackBar('ភ្ជាប់ប្រព័ន្ធបានជោគជ័យ', GlobalConstants.success);
                this.closeConnectDialog();
                this._loadProfile();
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

        this._profileService.disconnectSystem(access.system_id).subscribe({
            next: () => {
                this._snackBarService.openSnackBar('បានផ្ដាច់ការភ្ជាប់', GlobalConstants.success);
                this.disconnectingId = null;
                this._loadProfile();
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
        if (this.data?.avatar_uri) return `${this.FILE_URL}/${this.data.avatar_uri}`;
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

  backgroundImage = 'images/background/background-side.JPG';
  profileImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-M9UBTShaFJNXnvb5nubvN8VDoW0t6R.png';

  profileName = 'កាក់ សុខ័ត';
  profileNameEN = 'KAK SOKY';
  phone = '099 888 777';
  email = 'kak.soky@gmail.com';

  services: any[] = [
    {
      title: 'ពិគ្រោះយោបល់ជ័ន្តុប្បាសន្នៈ',
      description: 'ប្រទានសេវាឧទ្ធរណ៍ដល់អតិថិជនលើបញ្ហាច្បាប់ក្នុងវិស័យផ្សេងៗ',
      icon: 'user-icon',
      color: 'blue'
    },
    {
      title: 'សម្ងាត់របស់វិស័យក្រុម!',
      description: 'លក្ខណៈលម្អិតសម្រាប់ឯកសារយល់ដឹងលម្អិតនៃពាក្យបច្ចេកទេស',
      icon: 'check-icon',
      color: 'green'
    },
    {
      title: 'ផលប័ត្របង្ហាញលក្ខណៈ QR',
      description: 'ប្រទានសេវាឧទ្ធរណ៍ដល់អតិថិជនលើបញ្ហាច្បាប់ក្នុងវិស័យផ្សេងៗ',
      icon: 'qr-icon',
      color: 'yellow'
    }
  ];

  systems: any[] = [
    { name: 'ដូបផែនការ', icon: '🏛️' },
    { name: 'ដូបផែនការ', icon: '🤝' },
    { name: 'ដូបផែនការ', icon: '⚡' },
    { name: 'ដូបផែនការ', icon: '👥' },
    { name: 'ដូបផែនការ', icon: '🎁' },
    { name: 'ដូបផែនការ', icon: '🏢' },
    { name: 'ដូបផែនការ', icon: '⏰' },
    { name: 'ដូបផែនការ', icon: '📚' },
    { name: 'ដូបផែនការ', icon: '👨‍👩‍👧' },
    { name: 'ដូបផែនការ', icon: '⛪' },
    { name: 'ដូបផែនការ', icon: '🌐' },
    { name: 'ដូបផែនការ', icon: '⚖️' }
  ];

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

  getIconClass(icon: string): string {
    const iconMap: { [key: string]: string } = {
      'user-icon': 'icon-user',
      'check-icon': 'icon-check',
      'qr-icon': 'icon-qr'
    };
    return iconMap[icon] || icon;
  }

  getColorClass(color: string): string {
    const colorMap: { [key: string]: string } = {
      'blue': 'icon-blue',
      'green': 'icon-green',
      'yellow': 'icon-yellow'
    };
    return colorMap[color] || color;
  }

  getDeviceIcon(deviceName: string): string {
    const iconMap: { [key: string]: string } = {
      'Window': '🖥️',
      'iPhone 16': '📱',
      'iPad': '📱'
    };
    return iconMap[deviceName] || '';
  }
}
