import { CommonModule }                                          from '@angular/common';
import { Component, OnInit, ViewEncapsulation }                  from '@angular/core';
import {
    FormsModule, ReactiveFormsModule,
    UntypedFormBuilder, UntypedFormGroup, Validators, AbstractControl,
} from '@angular/forms';
import { Router, RouterLink }           from '@angular/router';

import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatInputModule }           from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule }       from '@angular/material/form-field';

import { TranslocoModule }          from '@ngneat/transloco';
import { helperAnimations }         from 'helper/animations';
import { SnackbarService }          from 'helper/services/snack-bar/snack-bar.service';
import GlobalConstants              from 'helper/shared/constants';
import { ErrorHandleService }       from 'app/shared/error-handle.service';
import { LanguagesComponent }       from 'app/layout/common/languages/languages.component';
import { ResourceAuthService }      from '../service';

@Component({
    selector      : 'auth-sign-up',
    templateUrl   : './template.html',
    styleUrl      : './style.scss',
    encapsulation : ViewEncapsulation.None,
    animations    : helperAnimations,
    standalone    : true,
    imports       : [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        TranslocoModule,
        LanguagesComponent,
        RouterLink,
    ],
})
export class AuthSignUpComponent implements OnInit {

    public form     : UntypedFormGroup;
    public isLoading: boolean = false;

    constructor(
        private _formBuilder        : UntypedFormBuilder,
        private _router             : Router,
        private _authService        : ResourceAuthService,
        private _snackBarService    : SnackbarService,
        private _errorHandleService : ErrorHandleService,
    ) {}

    ngOnInit(): void {
        this.form = this._formBuilder.group({
            first_name      : ['', [Validators.required, Validators.maxLength(100)]],
            last_name       : ['', [Validators.required, Validators.maxLength(100)]],
            phone           : ['', [Validators.required, Validators.minLength(7), Validators.maxLength(20)]],
            email           : ['', [Validators.required, Validators.email]],
            password        : ['', [Validators.required, Validators.minLength(8)]],
            confirm_password: ['', Validators.required],
        }, { validators: this._passwordMatchValidator });
    }

    private _passwordMatchValidator(group: AbstractControl) {
        const pw  = group.get('password')?.value;
        const cpw = group.get('confirm_password')?.value;
        if (pw && cpw && pw !== cpw) {
            group.get('confirm_password')?.setErrors({ mismatch: true });
        } else {
            const errors = group.get('confirm_password')?.errors;
            if (errors) {
                delete errors['mismatch'];
                group.get('confirm_password')?.setErrors(
                    Object.keys(errors).length ? errors : null
                );
            }
        }
        return null;
    }

    register(): void {
        if (this.form.invalid || this.isLoading) return;

        this.isLoading = true;
        this.form.disable();

        const { confirm_password, ...payload } = this.form.value;

        this._authService.register(payload).subscribe({
            next: res => {
                this._snackBarService.openSnackBar(res.message, GlobalConstants.success);
                this._router.navigate(['/auth/sign-in']);
            },
            error: err => {
                this.isLoading = false;
                this.form.enable();
                this._errorHandleService.handleHttpError(err);
            },
        });
    }
}
