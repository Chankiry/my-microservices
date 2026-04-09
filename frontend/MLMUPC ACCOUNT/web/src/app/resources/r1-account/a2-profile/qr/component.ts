import { DialogRef } from '@angular/cdk/dialog';
import { NgIf } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Inject, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { AuthService } from 'app/core/auth/auth.service';
import { UserService } from 'app/core/user/user.service';
import { env } from 'envs/env';
import { SkeletonQrCodeComponent } from 'helper/components/skeleton/qr_code/skeleton.component';
import { SnackbarService } from 'helper/services/snack-bar/snack-bar.service';
import GlobalConstants from 'helper/shared/constants';
import { catchError, finalize, of, tap } from 'rxjs';
import { io, Socket } from 'socket.io-client';

interface QRDialogData {
    mobile_login: boolean;
}

interface AuthResponse {
    status_code: number;
    success: number;
    message: {
        name_kh: string;
        name_en: string;
    };
    data: {
        user: any;
        token: string;
        refresh_token: string;
        message: string;
    };
}

interface QRCodeResponse {
    status_code: number;
    success: number;
    message: {
        name_kh: string;
        name_en: string;
    };
    data: {
        key: string;
        session: string;
        qr: string;
        expire_in: string;
    };
}

@Component({
    standalone: true,
    imports: [
        MatDialogModule,
        MatIconModule,
        SkeletonQrCodeComponent,
        TranslocoModule,
        NgIf,
    ],
    selector: 'qrdialog-component',
    templateUrl: 'template.html',
    styleUrl: './style.scss',
})
export class QRDialogComponent implements OnDestroy, OnInit {
    // Signals
    readonly qrCode = signal<string>('');
    readonly isLoading = signal<boolean>(true);
    readonly session_id = signal<string>('');
    readonly displayTime = signal<string>('02:00');
    readonly connectionStatus = signal<string>('connecting');

    // Constants
    private readonly WEBSOCKET_URL = process.env.NOTIFICATION_SERVICE_BASE_URL;
    private readonly WEBSOCKET_ROOM = process.env.NOTIFICATION_SERVICE_USERNAME;
    private readonly AUTHENTICATED_EVENT = 'authenticated';
    private readonly QR_SCANNED_EVENT = 'qr_scanned';
    private readonly MAX_QR_REQUEST_RETRIES = 3;

    // Private properties
    private socket?: Socket;
    private intervalId?: ReturnType<typeof setInterval>;
    private countdown = 120;
    private readonly destroyRef = inject(DestroyRef);
    private qrRequestRetries = 0;
    private socketConnectionTimeout?: ReturnType<typeof setTimeout>;
    private qrKey?: string;
    private isProcessingLogin = false;

    private readonly _url: string = env.API_BASE_URL;
    private readonly _userService = inject(UserService);
    private readonly _hasOrgId = !!localStorage.getItem('org');
    private readonly _hasCurrentRole = !!localStorage.getItem('currentRole');

    constructor(
        @Inject(MAT_DIALOG_DATA) private readonly data: QRDialogData,
        private readonly httpClient: HttpClient,
        private readonly authService: AuthService,
        private readonly snackbarService: SnackbarService,
        private readonly dialogRef: DialogRef<QRDialogComponent>,
        private readonly router: Router,
    ) { }

    // ============ Lifecycle ============
    ngOnInit(): void {
        if (this.data?.mobile_login) {
            this.validateAndRequestQrWithToken();
        } else {
            this.requestQr();
        }
    }

    ngOnDestroy(): void {
        this.cleanup();
    }

    private validateAndRequestQrWithToken(): void {
        const accessToken = this.authService.accessToken;
        if (!accessToken) {
            this.snackbarService.openSnackBar(
                {
                    name_kh: 'គ្មាន token ត្រឹមត្រូវទេ។ សូមចូលប្រព័ន្ធម្តងទៀត។',
                    name_en: 'No valid token found. Please log in again.',
                },
                GlobalConstants.error
            );
            this.isLoading.set(false);
            this.closeDialog();
            return;
        }
        this.requestQr();
    }

    // ============ WebSocket Management ============
    private initializeWebSocket(key: string): void {
        try {
            const websocketUrl = `${this.WEBSOCKET_URL}?client_id=${key}&room=${this.WEBSOCKET_ROOM}`;

            this.socket = io(websocketUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                autoConnect: true,
                upgrade: true,
                rememberUpgrade: true,
                forceNew: true,
            });

            this.setupSocketEvents();
            this.setupConnectionTimeout();

        } catch (error) {
            console.error('❌ Failed to initialize WebSocket:', error);
            this.connectionStatus.set('failed');
            this.snackbarService.openSnackBar(
                {
                    name_kh: 'បរាជ័យក្នុងការភ្ជាប់ WebSocket។',
                    name_en: 'Failed to initialize connection',
                },
                GlobalConstants.error
            );
            this.isLoading.set(false);
        }
    }

    private setupConnectionTimeout(): void {
        this.socketConnectionTimeout = setTimeout(() => {
            if (!this.socket?.connected) {
                this.connectionStatus.set('timeout');
                this.snackbarService.openSnackBar(
                    {
                        name_kh: 'ការតភ្ជាប់អស់ពេល។ សូមពិនិត្យបណ្តាញ និងព្យាយាមម្តងទៀត។',
                        name_en: 'Connection timeout. Please check your network and try again.',
                    },
                    GlobalConstants.error
                );
            }
        }, 30000);
    }

    private setupSocketEvents(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected');
            this.connectionStatus.set('connected');
            if (this.socketConnectionTimeout) {
                clearTimeout(this.socketConnectionTimeout);
                this.socketConnectionTimeout = undefined;
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error);
            this.connectionStatus.set('error');
        });

        this.socket.on(this.QR_SCANNED_EVENT, (data: any) => {
            console.log('📱 QR code scanned:', data);
            this.snackbarService.openSnackBar(
                {
                    name_kh: 'QR code ត្រូវបានស្កេន! កំពុងផ្ទៀងផ្ទាត់...',
                    name_en: 'QR code scanned! Authenticating...',
                },
                GlobalConstants.success
            );

            if (!this.data?.mobile_login) {
                this.submitQRLogin();
            }
        });

        this.socket.on(this.AUTHENTICATED_EVENT, (data: any) => {
            console.log('✅ Authentication received:', data);
            if (this.data?.mobile_login) {
                this.handleAuthentication(data);
            } else {
                this.submitQRLogin();
            }
        });

        this.socket.on('success', (data: any) => {
            console.log('✅ Success event received:', data);
            if (this.data?.mobile_login) {
                this.handleSuccess(data);
            } else {
                this.submitQRLogin();
            }
        });

        this.socket.onAny((eventName: string, data: any) => {
            if (data && data.success === 1) {
                if (this.data?.mobile_login) {
                    this.handleSuccessResponse(data);
                } else {
                    this.submitQRLogin();
                }
            }
        });

        this.socket.on('disconnect', () => {
            this.connectionStatus.set('disconnected');
        });

        this.socket.on('reconnect_failed', () => {
            this.connectionStatus.set('failed');
            this.snackbarService.openSnackBar(
                {
                    name_kh: 'មិនអាចភ្ជាប់ការតភ្ជាប់បានទេ។ សូម refresh និងព្យាយាមម្តងទៀត។',
                    name_en: 'Unable to establish connection. Please refresh and try again.',
                },
                GlobalConstants.error
            );
        });

        this.socket.on('error', (error) => {
            this.snackbarService.openSnackBar(
                {
                    name_kh: 'មានបញ្ហាកើតឡើងជាមួយការតភ្ជាប់។',
                    name_en: 'Connection error occurred',
                },
                GlobalConstants.error
            );
        });
    }

    // ============ QR Login Submit ============
    private submitQRLogin(): void {
        if (this.isProcessingLogin) return;

        const session = this.session_id();
        if (!session) {
            this.snackbarService.openSnackBar(
                {
                    name_kh: 'រកមិនឃើញ session។ សូមព្យាយាមម្តងទៀត។',
                    name_en: 'Session not found. Please try again.',
                },
                GlobalConstants.error
            );
            return;
        }

        this.isProcessingLogin = true;

        const url = `${this._url}/account/auth/login-qr/submit`;

        this.httpClient
            .post<AuthResponse>(url, { session })
            .pipe(
                catchError((error: HttpErrorResponse) => {
                    this.snackbarService.openSnackBar(
                        {
                            name_kh: 'ចូលប្រព័ន្ធបរាជ័យ។ សូមព្យាយាមម្តងទៀត។',
                            name_en: 'Login failed. Please try again.',
                        },
                        GlobalConstants.error
                    );
                    this.isProcessingLogin = false;
                    return of(null);
                }),
                finalize(() => this.isProcessingLogin = false),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response: AuthResponse | null) => {
                    if (response && response.success === 1 && response.data) {
                        this.handleLoginSuccess(response.data);
                    } else {
                        this.snackbarService.openSnackBar(
                            {
                                name_kh: 'ចូលប្រព័ន្ធបរាជ័យ។ ទិន្នន័យមិនត្រឹមត្រូវ។',
                                name_en: 'Login failed. Invalid response.',
                            },
                            GlobalConstants.error
                        );
                    }
                }
            });
    }

    // ============ Success Handlers ============
    private handleLoginSuccess(data: AuthResponse['data']): void {
        if (data.token) {
            this.authService.accessToken = data.token;
            localStorage.setItem('access_token', data.token);
        }
        if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
        }
        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        this.snackbarService.openSnackBar(
            {
                name_kh: 'ចូលប្រព័ន្ធជោគជ័យ!',
                name_en: data.message || 'Login successful!',
            },
            GlobalConstants.success
        );

        this.cleanup();
        this.dialogRef.close();
        setTimeout(() => this.router.navigateByUrl(''), 500);
    }

    private handleAuthentication(data: any): void {
        if (!data?.token) return;

        this.authService.accessToken = data.token;
        localStorage.setItem('access_token', data.token);

        this.snackbarService.openSnackBar(
            {
                name_kh: 'ផ្ទៀងផ្ទាត់ជោគជ័យ',
                name_en: data?.message || 'Authentication successful',
            },
            GlobalConstants.success
        );

        this.cleanup();
        this.dialogRef.close();
        this.router.navigateByUrl('');
    }

    private handleSuccess(data: any): void {
        this.snackbarService.openSnackBar(
            {
                name_kh: 'ចូលប្រព័ន្ធជោគជ័យ!',
                name_en: 'QR login successful!',
            },
            GlobalConstants.success
        );

        this.cleanup();
        this.dialogRef.close(data);

        if (data?.redirect) {
            this.router.navigateByUrl(data.redirect);
        } else {
            this.router.navigateByUrl('');
        }
    }

    private handleSuccessResponse(data: any): void {
        if (data?.data?.token || data?.token) {
            const token = data?.data?.token || data?.token;
            this.authService.accessToken = token;
            localStorage.setItem('access_token', token);
        }

        this.snackbarService.openSnackBar(
            {
                name_kh: 'ចូលប្រព័ន្ធជោគជ័យ!',
                name_en: data?.message?.name_en || data?.message || 'QR login successful!',
            },
            GlobalConstants.success
        );

        this.cleanup();
        this.dialogRef.close(data);

        setTimeout(() => this.router.navigateByUrl(''), 500);
    }

    // ============ QR Code Request ============
    private requestQr(): void {
        const url = this.data?.mobile_login
            ? `${this._url}/account/profile/login-qr/request`
            : `${this._url}/account/auth/login-qr/request`;

        this.httpClient
            .get<QRCodeResponse>(url)
            .pipe(
                tap(() => this.isLoading.set(true)),
                catchError((error: HttpErrorResponse) => {
                    this.snackbarService.openSnackBar(
                        {
                            name_kh: ' បរាជ័យក្នុងការផ្ទុក QR code។ សូមព្យាយាមម្តងទៀត។',
                            name_en: 'Failed to load QR code. Please try again.',
                        },
                        GlobalConstants.error
                    );
                    return of(null);
                }),
                finalize(() => this.isLoading.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response: QRCodeResponse | null) => {
                    if (response && response.success && response.data?.qr) {
                        this.qrCode.set(response.data.qr);
                        this.qrKey = response.data.key;
                        this.countdown = this.parseExpireIn(response.data.expire_in);
                        this.startCountdown();
                        this.initializeWebSocket(response.data.key);

                        if (response.data.session) {
                            this.session_id.set(response.data.session);
                        }
                    } else {
                        this.snackbarService.openSnackBar(
                            {
                                name_kh: 'ការទទួល QR code មិនត្រឹមត្រូវ។ សូមព្យាយាមម្តងទៀត។',
                                name_en: 'Invalid QR code received from server',
                            },
                            GlobalConstants.error
                        );
                    }
                }
            });
    }

    // ============ Helper Methods ============
    private parseExpireIn(expireIn: string): number {
        let totalSeconds = 0;
        const hoursMatch = expireIn.match(/(\d+)h/);
        const minutesMatch = expireIn.match(/(\d+)m/);
        const secondsMatch = expireIn.match(/(\d+)s/);

        if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;
        if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
        if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);

        return totalSeconds > 0 ? totalSeconds : 120;
    }

    private startCountdown(): void {
        this.updateDisplayTime(this.countdown);
        this.intervalId = setInterval(() => {
            this.countdown--;
            this.updateDisplayTime(this.countdown);
            if (this.countdown <= 0) this.handleTimeout();
        }, 1000);
    }

    private updateDisplayTime(seconds: number): void {
        const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        this.displayTime.set(`${minutes}:${secs}`);
    }

    private handleTimeout(): void {
        this.cleanup();
        this.snackbarService.openSnackBar(
            {
                name_kh: 'QR code ផុតកំណត់។ សូមព្យាយាមម្តងទៀត។',
                name_en: 'QR code expired. Please try again.'
            },
            GlobalConstants.error
        );
        this.closeDialog();
    }

    closeDialog(): void {
        this.cleanup();
        this.dialogRef.close();
    }

    private cleanup(): void {
        if (this.intervalId) clearInterval(this.intervalId);
        if (this.socketConnectionTimeout) clearTimeout(this.socketConnectionTimeout);
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = undefined;
        }
        this.isProcessingLogin = false;
    }
}
