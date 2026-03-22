// ================================================================================>> Core Library
import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

// ================================================================================>> Custom Library
// Helper
import GlobalConstants from 'helper/shared/constants';

// Service
import { SnackbarService } from 'helper/services/snack-bar/snack-bar.service';

@Injectable({
    providedIn: 'root'
})

export class ErrorHandleService {

    constructor(
        private _snackbarService: SnackbarService
    ) { }

    handleHttpError(err: HttpErrorResponse): void {
        // Default error message
        let message = GlobalConstants.genericError;

        if (err?.error) {
            // Handle field-specific or validation errors
            if (err.error.errors && err.error.errors.length > 0) {
                message = err.error.errors.map((obj) => obj.message).join(', ');
            } else {
                message = err.error.message ?? message;
            }
        }

        // Show snackbar with the error message
        this._snackbarService.openSnackBar(message, GlobalConstants.error);
    }

    
    handleError(message: string): void {
        this._snackbarService.openSnackBar(message, GlobalConstants.error);
    }
}
