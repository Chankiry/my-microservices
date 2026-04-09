import { DialogRef } from '@angular/cdk/dialog';
import { NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component ,Inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from 'app/core/auth/service';
import { env } from 'envs/env';
import { SnackbarService } from 'helper/services/snack-bar/snack-bar.service';
import GlobalConstants from 'helper/shared/constants';
import { finalize, Observable, Subject, takeUntil, tap } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Component({
    standalone: true,
    imports: [
        MatDialogModule,
        MatIconModule,
        // MatProgressSpinnerModule,
        NgIf,
    ],
    selector: 'qrdialog-component',
    templateUrl: 'template.html',
    styles: [`
        // .qrbox::after {
        //     content: '';
        //     position: absolute;
        //     top: 50%;
        //     left: 50%;
        //     transform: translate(-50%, -50%);
        //     width: 105%;
        //     height: 105%;
        //     pointer-events: none;
        //     z-index: -1;
        // }
        // .qrbox::after {
        //     background:  /* Top-left corner */
        //         linear-gradient(to right, rgb(30, 58, 138) 60px, transparent 60px),
        //         linear-gradient(to bottom, rgb(30, 58, 138) 60px, transparent 60px),

        //         /* Bottom-right corner */
        //         linear-gradient(to left, rgb(30, 58, 138) 60px, transparent 60px),
        //         linear-gradient(to top, rgb(30, 58, 138) 60px, transparent 60px),

        //         /* Top-right corner */
        //         linear-gradient(to left, rgb(30, 58, 138) 60px, transparent 60px),
        //         linear-gradient(to bottom, rgb(30, 58, 138) 60px, transparent 60px),

        //         /* Bottom-left corner */
        //         linear-gradient(to right, rgb(30, 58, 138) 60px, transparent 60px),
        //         linear-gradient(to top, rgb(30, 58, 138) 60px, transparent 60px);
        //         background-repeat: no-repeat;
        //         background-size:
        //             60px 5px, 5px 60px, /* top-left */
        //             60px 5px, 5px 60px, /* bottom-right */
        //             60px 5px, 5px 60px, /* top-right */
        //             60px 5px, 5px 60px; /* bottom-left */

        //         background-position:
        //             top left, top left,
        //             bottom right, bottom right,
        //             top right, top right,
        //             bottom left, bottom left;
        // }
    `]
})

export class QRDialogComponent implements OnDestroy, OnInit {

    qrCode = signal<string>('');
    isLoading = signal<boolean>(false);
    session_id = signal<string>('');

    private socket: Socket;
    private readonly _url: string = env.API_BASE_URL;
    private _unsubscribeAll: Subject<void> = new Subject<void>();


    constructor(
        @Inject(MAT_DIALOG_DATA) private data: any,
        private httpClient: HttpClient,
        private _authService: AuthService,
        private _snackbarService: SnackbarService,
        private _dialogRef: DialogRef<QRDialogComponent>,
        private _router: Router,
    ) {  }

    ngOnInit(): void {
        // if(!this.data.with_token){
        //     this.socket = io(`${env.SOCKET_URL}/qr`);

        //     this.socket.on('connect', () => {
        //         this.session_id.set(this.socket.id);
        //         this.requestQr();
        //     });

        //     this.onQrResult().subscribe(data => {
        //         this._authService.phone = data?.phone;
        //         this._authService.token = data?.token;
        //         this._authService.verified(data?.token);
        //         this._snackbarService.openSnackBar(data?.message, GlobalConstants.success);
        //         this._dialogRef.close();
        //         this._router.navigateByUrl('');
        //     });
        // }else{
        //     this.requestQr();
        // }
    }

    requestQr() {
        // This function should request a new QR code from the server
        this.httpClient.get(`${this._url}/auth/profile/login-qr/request?${this.data.with_token ? 'with_token=true' : `session_id=${this.session_id()}`}`, { responseType: 'blob' })
        .pipe(
            tap(() => this.isLoading.set(true)),
            finalize(() => this.isLoading.set(false))
        )
        .subscribe({
            next: (blob: Blob) => {
                const reader = new FileReader();
                reader.onload = () => {
                    this.qrCode.set(reader.result as string);
                };
                reader.readAsDataURL(blob);
            },
            error: (error) => console.error('Error fetching QR code:', error)
        });
    }

    onQrResult(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('authenticated', (data) => {
                observer.next(data);
            });
        });
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        if(this.socket){
            this.socket.disconnect();
        }
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
}
