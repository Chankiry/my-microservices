import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';

@Injectable({providedIn: 'root'})
export class SnackbarService {

    constructor(
      private _snackbar: MatSnackBar,
      private _translocoService : TranslocoService,
    ) { }

    openSnackBar(message: { name_kh: string; name_en: string; }, action: string, isMessage?: boolean): void {
        const config = new MatSnackBarConfig();
        config.duration = 3000;
        if(isMessage){
            config.horizontalPosition = 'center';
        }else{
            config.horizontalPosition = 'right';
        }

        if (this._translocoService.getActiveLang() === 'en') {
            config.data = message.name_en;
        } else {
            config.data = message.name_kh;
        }

        config.verticalPosition = 'bottom';
        if (action === 'error') {
            config.panelClass = ['red-snackbar'];
        } else {
            config.panelClass = ['green-snackbar'];
        }

        this._snackbar.open(config.data, '', config);
    }
}
