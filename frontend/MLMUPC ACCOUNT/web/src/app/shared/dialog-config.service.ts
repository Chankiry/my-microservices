import { Injectable } from '@angular/core';
import { MatDialogConfig } from '@angular/material/dialog';

@Injectable({
    providedIn: 'root',
})

export class DialogConfigService {
    /**
     * Returns a pre-configured MatDialogConfig object.
     * @param data Optional data to pass to the dialog.
     */
    getDialogConfig(data: any = null): MatDialogConfig {
        const defaultConfig : MatDialogConfig = {
            autoFocus               : false,
            position                : { right: '0', top: '0' },
            width                   : '600px',
            height                  : '100vh',
            panelClass              : 'side-dialog',
            data                    : data || null,
        };

        return defaultConfig;
    }
}
