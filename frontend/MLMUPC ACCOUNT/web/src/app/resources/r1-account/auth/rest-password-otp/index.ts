// ================================================================================>> Main Library
import { CommonModule, NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// ================================================================================>> Third Party Library
// Material
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// RxJS
import { Subject } from 'rxjs';

// Transloco
import { TranslocoModule } from '@ngneat/transloco';

// ================================================================================>> Custom Library
// Helper
import GlobalConstants from 'helper/shared/constants';

// Service
import { AuthService } from 'app/core/auth/auth.service';
import { SnackbarService } from 'helper/services/snack-bar/snack-bar.service';
import { ErrorHandleService } from 'app/shared/error-handle.service';

@Component({
    selector: 'otp',
    templateUrl: 'template.html',
    styleUrls: ['./style.scss'],
    standalone: true,
    imports: [
        FormsModule,
        CommonModule,
        NgIf,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatProgressSpinnerModule,
        TranslocoModule,
    ],
})

export class AuthOTPForResetPasswordComponent implements OnInit {
    private _unsubscribeAll: Subject<void> = new Subject<void>();

    @ViewChild('input1') input1: ElementRef;
    @ViewChild('input2') input2: ElementRef;
    @ViewChild('input3') input3: ElementRef;
    @ViewChild('input4') input4: ElementRef;
    @ViewChild('input5') input5: ElementRef;
    @ViewChild('input6') input6: ElementRef;

    public numStr1: string = '';
    public numStr2: string = '';
    public numStr3: string = '';
    public numStr4: string = '';
    public numStr5: string = '';
    public numStr6: string = '';

    public otpCode: string = '';
    public reSendOtp: boolean = false;

    public countdownInterval: any;
    public remainingTime: number = 0;

    public email: string = '';

    public canSubmit: boolean = false;
    public isLoading: boolean = false;


    constructor(
        private _authService: AuthService,
        private _router: Router,
        private _snackbarService: SnackbarService,
        private _errorHandleService: ErrorHandleService,
    ) { }

    ngOnInit() {
        this.email = localStorage.getItem('email');
        this.remainingTime = 60;
        this.startCountdown();
    }

    startCountdown() {
        this.remainingTime -= 1;
        this.countdownInterval = setInterval(() => {
            if (this.remainingTime > 0) {
                this.remainingTime--;
            } else {
                clearInterval(this.countdownInterval);
                this.reSendOtp = true;
                this.numStr1 = this.numStr2 = this.numStr3 = this.numStr4 = this.numStr5 = this.numStr6 = '';
                this.canSubmit = false;
            }
        }, 1000);
    }

    formatTime(seconds: number): string {
        const minutes: number = Math.floor(seconds / 60);
        const remainingSeconds: number = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    resendOtp(): void {
        this.isLoading = true;

        const credentials = {
            username: this.email,
        };

        // Placeholder for the forgot password service to be updated later
        // this._authService.forgotPassword(this.email).subscribe({
        //     next: res => {
        //         this.isLoading = false;
        //         this.remainingTime = 60;
        //         this.startCountdown();
        //         this.reSendOtp = false;
        //         this._snackbarService.openSnackBar(res?.message || 'OTP has been resent', 'success');
        //     },
        //     error: err => {
        //         this.isLoading = false;
        //         this._errorHandleService.handleHttpError(err);
        //     }
        // });
    }
    verify(): void {
        this.isLoading = true;

        const credentials = { email: this.email, otp: this.otpCode };

        // this._authService.verifyResetOtp(credentials).subscribe({
        //     next: (res) => {
        //         this.isLoading = false;
        //         this.clearAllInput();

        //         if (res.message) {
        //             this._snackbarService.openSnackBar(res.message, 'success');
        //             // After successful OTP verification, navigate to reset-password page
        //             this.navigateToResetPassword();
        //         } else {
        //             this._snackbarService.openSnackBar('Verification failed. Please try again.', 'error');
        //         }
        //     },
        //     error: (err) => {
        //         this.isLoading = false;
        //         this._errorHandleService.handleHttpError(err);
        //     },
        // });
    }

    navigateToResetPassword(): void {
        this._router.navigateByUrl('/auth/reset-password');
    }


    clearAllInput() {
        this.numStr1 = '';
        this.numStr2 = '';
        this.numStr3 = '';
        this.numStr4 = '';
        this.numStr5 = '';
        this.numStr6 = '';
    }

    keyDownHandler1(event: KeyboardEvent | any): void {
        if (event.key === 'Backspace') {
            this.numStr1 = '';
            this.checkValid();
            event.preventDefault();
        } else if (event.key === 'Tab') {
            event.preventDefault();
        } else {
            var keyCode = event.which || event.keyCode;

            if (keyCode !== 46 && keyCode > 31 && (keyCode < 48 || keyCode > 57)) {
                if (this.numStr1 !== '') {
                    this.input2.nativeElement.focus();
                }
                event.preventDefault();
            } else {
                const array = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

                if (array.includes(event.key)) {
                    this.numStr1 = event.key;
                    if (!this.checkValid()) {
                        this.input2.nativeElement.focus();
                    } else {
                        this.input1.nativeElement.blur();
                    }
                    event.preventDefault();
                } else {
                    // Prevent input of non-English numbers (Khmer numbers)
                    event.preventDefault();
                }
            }
        }

    }

    keyDownHandler2(event: KeyboardEvent | any): void {
        if (event.key === 'Backspace') {
            if (this.numStr2 === '') {
                this.input1.nativeElement.focus();
            }
            this.numStr2 = '';
            this.checkValid();
            event.preventDefault();
        } else if (event.key === 'Tab') {
            event.preventDefault();
        } else {
            var keyCode = event.which || event.keyCode;

            if (keyCode !== 46 && keyCode > 31 && (keyCode < 48 || keyCode > 57)) {
                if (this.numStr2 !== '') {
                    this.input3.nativeElement.focus();
                }
                event.preventDefault();
            } else {
                const array = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

                if (array.includes(event.key)) {
                    this.numStr2 = event.key;
                    if (!this.checkValid()) {
                        this.input3.nativeElement.focus();
                    } else {
                        this.input2.nativeElement.blur();
                    }
                    event.preventDefault();
                } else {
                    // Prevent input of non-English numbers (Khmer numbers)
                    event.preventDefault();
                }
            }
        }
    }

    keyDownHandler3(event: KeyboardEvent | any): void {
        if (this.numStr3 === '') {
            this.input2.nativeElement.focus();
        }
        if (event.key === 'Backspace') {
            this.numStr3 = '';
            this.checkValid();
            event.preventDefault();
        } else if (event.key === 'Tab') {
            event.preventDefault();
        } else {
            var keyCode = event.which || event.keyCode;

            if (keyCode !== 46 && keyCode > 31 && (keyCode < 48 || keyCode > 57)) {
                if (this.numStr3 !== '') {
                    this.input4.nativeElement.focus();
                }
                event.preventDefault();
            } else {
                const array = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

                if (array.includes(event.key)) {
                    this.numStr3 = event.key;
                    if (!this.checkValid()) {
                        this.input4.nativeElement.focus();
                    } else {
                        this.input3.nativeElement.blur();
                    }
                    event.preventDefault();
                } else {
                    // Prevent input of non-English numbers (Khmer numbers)
                    event.preventDefault();
                }
            }
        }
    }

    keyDownHandler4(event: KeyboardEvent | any): void {
        if (event.key === 'Backspace') {
            if (this.numStr4 === '') {
                this.input3.nativeElement.focus();
            }
            this.numStr4 = '';
            this.checkValid();
            event.preventDefault();
        } else if (event.key === 'Tab') {
            event.preventDefault();
        } else {
            var keyCode = event.which || event.keyCode;

            if (keyCode !== 46 && keyCode > 31 && (keyCode < 48 || keyCode > 57)) {
                if (this.numStr4 !== '') {
                    this.input5.nativeElement.focus();
                }
                event.preventDefault();
            } else {
                const array = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

                if (array.includes(event.key)) {
                    this.numStr4 = event.key;
                    if (!this.checkValid()) {
                        this.input5.nativeElement.focus();
                    } else {
                        this.input4.nativeElement.blur();
                    }
                    event.preventDefault();
                } else {
                    // Prevent input of non-English numbers (Khmer numbers)
                    event.preventDefault();
                }
            }
        }
    }

    keyDownHandler5(event: KeyboardEvent | any): void {
        if (event.key === 'Backspace') {
            if (this.numStr5 === '') {
                this.input4.nativeElement.focus();
            }
            this.numStr5 = '';
            this.checkValid();
            event.preventDefault();
        } else if (event.key === 'Tab') {
            event.preventDefault();
        } else {
            var keyCode = event.which || event.keyCode;

            if (keyCode !== 46 && keyCode > 31 && (keyCode < 48 || keyCode > 57)) {
                if (this.numStr5 !== '') {
                    this.input6.nativeElement.focus();
                }
                event.preventDefault();
            } else {
                const array = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

                if (array.includes(event.key)) {
                    this.numStr5 = event.key;
                    if (!this.checkValid()) {
                        this.input6.nativeElement.focus();
                    } else {
                        this.input5.nativeElement.blur();
                    }
                    event.preventDefault();
                } else {
                    // Prevent input of non-English numbers (Khmer numbers)
                    event.preventDefault();
                }
            }
        }
    }

    keyDownHandler6(event: KeyboardEvent | any): void {
        if (event.key === 'Backspace') {
            if (this.numStr6 === '') {
                this.input5.nativeElement.focus();
            }
            this.numStr6 = '';
            this.checkValid();
            event.preventDefault();
        } else if (event.key === 'Tab') {
            event.preventDefault();
        } else {
            var keyCode = event.which || event.keyCode;

            if (keyCode !== 46 && keyCode > 31 && (keyCode < 48 || keyCode > 57)) {
                event.preventDefault();
            } else {
                const array = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

                if (array.includes(event.key)) {
                    this.numStr6 = event.key;
                    if (this.checkValid()) {
                        this.input6.nativeElement.blur();
                    }
                    event.preventDefault();
                } else {
                    // Prevent input of non-English numbers (Khmer numbers)
                    event.preventDefault();
                }
            }
        }
    }

    // Listen for keyup event on the document
    @HostListener('document:keyup', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if (event.key === 'Enter' && this.numStr6 !== '') {
            if (this.checkValid()) {
                this.input6.nativeElement.blur();
                this.verify();
            }
            event.preventDefault();
        }
    }

    checkValid(): boolean {
        this.otpCode = this.numStr1 + this.numStr2 + this.numStr3 + this.numStr4 + this.numStr5 + this.numStr6;
        this.canSubmit = this.otpCode.length === 6;
        return this.canSubmit;
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
}
