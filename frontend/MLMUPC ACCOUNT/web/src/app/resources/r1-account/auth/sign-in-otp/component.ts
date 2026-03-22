// ================================================================================>> Main Library
import { CommonModule, NgIf } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
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
import { LanguagesComponent } from 'app/layout/common/languages/languages.component';

@Component({
    selector: 'auth-sign-in-otp',
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
        LanguagesComponent
    ],
})

export class AuthSignInOTPComponent implements OnInit {

    @Input() username : string = "";
    @Output() back = new EventEmitter<boolean>();


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
    public otpFailed: boolean = false;
    public remainingAttempts: number = 3;

    public countdownInterval: any;
    public remainingTime: number = 0;

    public canSubmit: boolean = false;
    public isLoading: boolean = false;


    constructor(
        private _authService: AuthService,
        private _router: Router,
        private _snackbarService: SnackbarService,
        private _errorHandleService: ErrorHandleService,
    ) { }

    ngOnInit() {
        this.remainingTime = 60;
        this.startCountdown();
    }

    return(){
        this.back.emit(false);
    }

    startCountdown() {
        this.remainingTime -= 1;
        this.countdownInterval = setInterval(() => {
            if (this.remainingTime > 0) {
                this.remainingTime--;
            } else {
                this.handleTimerExpired();
            }
        }, 1000);
    }

    handleTimerExpired(): void {
        clearInterval(this.countdownInterval);
        this.reSendOtp = true;
        this.otpFailed = true; // Disable submission
        this.clearAllInput();
        this.canSubmit = false;
    }

    formatTime(seconds: number): string {
        const minutes: number = Math.floor(seconds / 60);
        const remainingSeconds: number = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    resendOtp(): void {
        if (this.isLoading) return;

        this.isLoading = true;
        this.otpFailed = false; // Reset failure state
        this.remainingAttempts = 3; // Reset attempts
        this.clearAllInput();

        const credentials = {
            username: this.username,
        };

        this._authService.sendOtp(credentials).subscribe({
            next: res => {
                this.isLoading = false;
                this.remainingTime = 60;
                this.reSendOtp = false;
                this.startCountdown();
                this._snackbarService.openSnackBar(res?.message || GlobalConstants.genericResponse, GlobalConstants.success);
            },
            error: err => {
                this.isLoading = false;
                this._errorHandleService.handleHttpError(err);
            }
        });
    }


    verify(): void {
        if (this.otpFailed || !this.canSubmit || this.isLoading) return;

        this.isLoading = true;

        const credentials = {
            username: this.username,
            otp: this.otpCode
        };
        this._authService.verifyOtp(credentials).subscribe({
            next: res => {
                this.isLoading = false;
                this.clearAllInput();
                this._router.navigateByUrl('');
                this._snackbarService.openSnackBar("ចូលប្រព័ន្ធបានដោយជោគជ័យ", GlobalConstants.success);
            },
            error: err => {
                this.isLoading = false;
                this.remainingAttempts--;

                if (this.remainingAttempts <= 0) {
                    this.otpFailed = true;
                    this._snackbarService.openSnackBar("អ្នកបានព្យាយាមលើសចំនួនដង OTP ។ សូមស្នើសុំ OTP ថ្មី។", GlobalConstants.error);
                } else {
                    this._snackbarService.openSnackBar(`បញ្ចូល OTP ខុស,សល់ ${this.remainingAttempts} ចំនួនដងទៀត`, GlobalConstants.error);
                }

                this.clearAllInput();
                this.canSubmit = false;
            }
        });
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

            // Allow both main number row (48-57) and numpad (96-105)
            if (keyCode !== 46 && keyCode > 31 &&
                (keyCode < 48 || keyCode > 57) &&
                (keyCode < 96 || keyCode > 105)) {
                if (this.numStr1 !== '') {
                    this.input2.nativeElement.focus();
                }
                event.preventDefault();
            } else {
                // Accept both regular numbers and numpad numbers
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

            // Allow both main number row (48-57) and numpad (96-105)
            if (keyCode !== 46 && keyCode > 31 &&
                (keyCode < 48 || keyCode > 57) &&
                (keyCode < 96 || keyCode > 105)) {
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
        if (event.key === 'Backspace') {
            if (this.numStr3 === '') {
                this.input2.nativeElement.focus();
            }
            this.numStr3 = '';
            this.checkValid();
            event.preventDefault();
        } else if (event.key === 'Tab') {
            event.preventDefault();
        } else {
            var keyCode = event.which || event.keyCode;

            // Allow both main number row (48-57) and numpad (96-105)
            if (keyCode !== 46 && keyCode > 31 &&
                (keyCode < 48 || keyCode > 57) &&
                (keyCode < 96 || keyCode > 105)) {
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

            // Allow both main number row (48-57) and numpad (96-105)
            if (keyCode !== 46 && keyCode > 31 &&
                (keyCode < 48 || keyCode > 57) &&
                (keyCode < 96 || keyCode > 105)) {
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

            // Allow both main number row (48-57) and numpad (96-105)
            if (keyCode !== 46 && keyCode > 31 &&
                (keyCode < 48 || keyCode > 57) &&
                (keyCode < 96 || keyCode > 105)) {
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

            // Allow both main number row (48-57) and numpad (96-105)
            if (keyCode !== 46 && keyCode > 31 &&
                (keyCode < 48 || keyCode > 57) &&
                (keyCode < 96 || keyCode > 105)) {
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
        this.canSubmit = this.otpCode.length === 6 && !this.otpFailed;
        return this.canSubmit;
    }

    onPaste(event: ClipboardEvent) {
        event.preventDefault();
        event.stopPropagation();

        const pastedData = event.clipboardData?.getData('text') ?? '';
        const digits = pastedData.replace(/\D/g, '').slice(0, 6);

        if (digits.length === 6) {
            this.numStr1 = digits.charAt(0);
            this.numStr2 = digits.charAt(1);
            this.numStr3 = digits.charAt(2);
            this.numStr4 = digits.charAt(3);
            this.numStr5 = digits.charAt(4);
            this.numStr6 = digits.charAt(5);

            this.checkValid(); // Add this to update canSubmit and enable the button
        }
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
}
