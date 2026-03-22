// ================================================================================>> Main Library
import { CommonModule } from '@angular/common';
import { Component, Inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

// ================================================================================>> Third Party Library
import { MatButtonModule } from '@angular/material/button';

import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'helpers-img-viewer',
    standalone: true,
    templateUrl: './img-viewer.component.html',
    styleUrls: ['./img-viewer.component.scss'],
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatInputModule,
        MatProgressSpinnerModule
    ]
})
export class HelpersImgViewerComponent implements AfterViewInit {
    zoom: number = 0.8;
    normalZoom: number = 1;
    maxZoom: number = 4;
    minZoom: number = 0.3;
    zoomStep: number = 0.1;
    originalWidth: number;
    originalHeight: number;
    imgWidth: number;
    imgHeight: number;
    containerWidth: number;
    isLoading: boolean = true; // Loading state

    @ViewChild('container') containerRef: ElementRef;

    constructor(@Inject(MAT_DIALOG_DATA) public file: { url: string, title: string }) {
    }

    ngOnInit() {
        const img = new Image();
        img.src = this.file.url;
        img.onload = () => {
            this.originalWidth = img.width;
            this.originalHeight = img.height;
            this.updateImageSize();
            this.isLoading = false; // Hide the loading spinner
        };
    }

    ngAfterViewInit() {
        this.containerWidth = this.containerRef.nativeElement.clientWidth;
    }

    private getDecodedFileName(fileName: string): string {

        try {
            const decoded = decodeURIComponent(fileName);
            return decoded;
        } catch (e) {

            try {
                const decoder = new TextDecoder('utf-8');
                const encoded = new TextEncoder().encode(fileName);
                const decoded = decoder.decode(encoded);
                return decoded;
            } catch (error) {
            }

            try {
                const decoded = decodeURIComponent(escape(fileName));
                return decoded;
            } catch (error) {
                console.log('Escape method failed');
            }

            return fileName;
        }
    }

      downloadImage(): void {

        const decodedFileName = this.getDecodedFileName(this.file.title);

        fetch(this.file.url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {

                // Check if we need to add file extension based on blob type
                let finalFileName = decodedFileName;
                if (blob.type && !finalFileName.includes('.')) {
                    const extension = blob.type.split('/')[1];
                    if (extension) {
                        finalFileName = `${finalFileName}.${extension}`;
                    }
                }

                const link = document.createElement('a');
                const url = window.URL.createObjectURL(blob);

                link.href = url;
                link.download = finalFileName;
                link.style.display = 'none';

                document.body.appendChild(link);
                link.click();

                // Clean up
                setTimeout(() => {
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }, 100);
            })
            .catch(error => {
                console.error('Download error details:', error);
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);

                // Fallback to direct download
                const link = document.createElement('a');
                link.href = this.file.url;
                link.download = decodedFileName;
                link.style.display = 'none';
                document.body.appendChild(link);

                try {
                    link.click();
                    console.log('Fallback download attempted');
                } catch (fallbackError) {
                    console.error('Fallback also failed:', fallbackError);
                }

                setTimeout(() => document.body.removeChild(link), 100);
            });
    }

    generateDownloadLink(uri: string): string {
        return `${uri}?download=true`;
    }

    zoomIn(): void {
        const newZoom = this.zoom + this.zoomStep;
        if (newZoom <= this.maxZoom && (this.originalWidth * newZoom) <= this.containerWidth + 200) {
            this.zoom = newZoom;
            this.updateImageSize();
        }
    }

    zoomOut(): void {
        const newZoom = this.zoom - this.zoomStep;
        if (newZoom >= this.minZoom) {
            this.zoom = newZoom;
            this.updateImageSize();
        }
    }

    updateImageSize(): void {
        this.imgWidth = this.originalWidth * this.zoom;
        this.imgHeight = this.originalHeight * this.zoom;
    }

    get canZoomIn(): boolean {
        const newZoom = this.zoom + this.zoomStep;
        return this.zoom <= this.maxZoom && (this.originalWidth * newZoom) <= this.containerWidth + 200;
    }

    get canZoomOut(): boolean {
        const newZoom = this.zoom - this.zoomStep;
        return newZoom >= this.minZoom;
    }
}
