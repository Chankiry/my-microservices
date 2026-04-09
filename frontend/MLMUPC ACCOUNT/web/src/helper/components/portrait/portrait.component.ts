import { CommonModule } from '@angular/common';
import { Component, Input, Inject, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { SnackbarService } from 'helper/services/snack-bar/snack-bar.service';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';

@Component({
    selector: 'helper-portrait',
    templateUrl: './portrait.component.html',
    styleUrls: ['./portrait.component.scss'],
    standalone: true,
    imports: [MatIconModule, MatDialogModule, CommonModule, MatButtonModule]
})
export class PortraitComponent {
    @Input() src: string = 'assets/images/avatars/image-icon.jpg';
    @Input() delete: boolean;
    @Input() index: string = '';
    @Input() title: string = 'ផ្ទុកឯកសារ​';
    @Input() mode: string = 'READONLY';
    @Input() responseType: string = 'base64';
    @Input() disabled: boolean;
    @Output() srcChange = new EventEmitter();
    constructor(
        public dialog: MatDialog,
        private snackBar: SnackbarService
    ) { }

    remove(): void {
        this.delete = false;
        this.src = 'assets/images/avatars/image-icon.jpg';
        this.srcChange.emit('');
    }

    fileChangeEvent(event: any): void {
        let check: string = '';
        check = event.target?.files[0]?.type ?? '';
        if (check.substring(0, 5) === 'image') {
            const dialogRef = this.dialog.open(PortraitDialogComponent, {
                width: '600px',
                data: {
                    event: event,
                    responseType: this.responseType,
                },
            });

            dialogRef.afterClosed().subscribe((result) => {
                if (result !== '') {
                    this.delete = true;
                    this.src = result;
                    this.srcChange.emit(result);
                }
            });
        } else {

            this.snackBar.openSnackBar(
                {
                    name_kh: 'សូមជ្រើសរើស file ប្រភេទជារូបភាព',
                    name_en: 'Please select an image file',
                },
                'error'
            );
        }
    }

    selectFile(): void {
        if (this.mode === 'READONLY') {
            return;
        }
        document.getElementById(`portraitFile-${this.index}`).click();
    }

}
// helper function to convert base64 to File object
function base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
}
// ===================================================================>> Dialog
@Component({
    selector: 'helper-portrait-dialog',
    templateUrl: 'dialog.component.html',
    styleUrls: ['./portrait.component.scss'],
    standalone: true,
    imports: [MatIconModule, MatDialogModule, ImageCropperComponent, MatButtonModule]
})
export class PortraitDialogComponent {
    public result: any;
    public imageChangedEvent: any = '';
    public aspect: any;
    @Input() responseType: string = 'base64';

    constructor(
        public dialogRef: MatDialogRef<PortraitDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private snackBar: SnackbarService
    ) {
        this.imageChangedEvent = data.event;
        this.aspect = data.aspect || 4 / 3;
    }

    close(): void {
        this.dialogRef.close('');
    }

    imageCropped(event: ImageCroppedEvent): void {
        if (this.data.responseType === 'file') {
            const fileName = 'cropped-avatar.jpg';
            this.result = base64ToFile(event.base64, fileName); // return File
        } else {
            this.result = event.base64; // default behavior
        }
    }


    imageLoaded(): void {
        // show cropper
    }
    cropperReady(): void {
        // cropper ready
    }
    loadImageFailed(): void {
        // show message
    }
}
