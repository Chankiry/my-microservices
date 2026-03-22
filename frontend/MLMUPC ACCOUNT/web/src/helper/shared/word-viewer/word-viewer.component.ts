import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'helpers-word-viewer',
    standalone: true,
    templateUrl: './word-viewer.component.html',
    styleUrls: ['./word-viewer.component.scss'],
    imports: [
        CommonModule,
        MatIconModule,
        MatDialogModule,
        MatInputModule,
        MatProgressSpinnerModule
    ]
})
export class HeplersWordViewerComponent {

    isLoading = true;
    safeUrl: SafeResourceUrl;

    constructor(
        @Inject(MAT_DIALOG_DATA) public file: { url: string, title: string },
        private sanitizer: DomSanitizer,
        private dialog: MatDialog
    ) {
        this.safeUrl = this.getOfficeOnlineViewerUrl(this.file.url);
        this.isLoading = false;
    }

    getOfficeOnlineViewerUrl(url: string): SafeResourceUrl {
        const encodedUrl = encodeURIComponent(url);
        const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`;
        return this.sanitizer.bypassSecurityTrustResourceUrl(officeUrl);
    }

    downloadWord(): void {
        const link = document.createElement('a');
        link.href = this.file.url;
        link.download = this.file.title;
        link.click();
    }

    printWord(): void {
        const win = window.open(this.safeUrl as string, '_blank');
        win.onload = () => {
            win.print();
        };
    }
}
