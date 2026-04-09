import { MatDialogConfig } from "@angular/material/dialog";

/**
 * **for side dialog on the right**
 *
 * @param data
 * @param customOptions
 */
export function getSideDialogConfig(data: any = null, customOptions: Partial<MatDialogConfig> = {}, disableClose: boolean = false): MatDialogConfig {
    const defaultConfig : MatDialogConfig = {
        autoFocus               : false,
        disableClose            : disableClose,
        position                : { right: '0', top: '0' },
        width                   : '600px',
        height                  : '100vh',
        exitAnimationDuration   : '0.1s',
        enterAnimationDuration  : '0.1s',
        panelClass              : ['side-dialog','hide-scrollbar'],
        data                    : data || null,
    };

    return { ...defaultConfig, ...customOptions };
}

/**
 * **for popup dialog**
 * @param data
 * @param customOptions
 */
export function getDialogConfig(data: any = null, customOptions: Partial<MatDialogConfig> = {}): MatDialogConfig {
    const defaultConfig : MatDialogConfig = {
        autoFocus               : false,
        maxWidth                : '50dvw',
        maxHeight               : '90dvh',
        exitAnimationDuration   : '0.1s',
        enterAnimationDuration  : '0.1s',
        data                    : data || null,
    };

    return { ...defaultConfig, ...customOptions };
}
