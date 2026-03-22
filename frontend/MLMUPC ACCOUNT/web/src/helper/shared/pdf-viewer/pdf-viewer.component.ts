// ================================================================================>> Main Library
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

// ================================================================================>> Third Party Library
// Material
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// ================================================================================>> File
import { saveAs } from 'file-saver'; // Add this import
// ================================================================================>> Custom Library
// Ng
import { PdfViewerModule } from 'ng2-pdf-viewer';

@Component({
    selector: 'helpers-pdf-viewer',
    standalone: true,
    templateUrl: './pdf-viewer.component.html',
    styleUrls: ['./pdf-viewer.component.scss'],
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        PdfViewerModule,
        MatDialogModule,
        MatInputModule,
        MatProgressSpinnerModule,
        FormsModule
    ]
})
export class HelpersPdfViewerComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public file: { url: string, title: string }) {
     }

    currentPage: number = 1;
    totalPages: number = 0;
    zoom: number = 1;
    normalZoom: number = 1;
    highZoom: number = 2;
    isLoading: boolean = true;

    afterLoadComplete(pdfData: any): void {
        this.totalPages = pdfData.numPages;
        this.isLoading = false;
    }

    validateInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        let value = input.value.replace(/[^0-9]/g, '');

        // Ensure value is not empty
        if (!value) {
            value = '1';
        }

        // Convert to number and validate range
        const pageNum = parseInt(value, 10);
        this.currentPage = Math.max(1, Math.min(pageNum, this.totalPages));
        input.value = this.currentPage.toString();
    }

    goToPage(): void {
        // This will trigger the pdf-viewer's page change through the two-way binding
        this.currentPage = Math.max(1, Math.min(this.currentPage, this.totalPages));
    }

    // Rest of your methods remain the same...
    zoomIn(): void {
        this.zoom *= 1.1;
    }

    zoomOut(): void {
        this.zoom /= 1.1;
    }

    zoomToggle(): void {
        this.zoom = this.zoom === this.normalZoom ? this.highZoom : this.normalZoom;
    }

      private getDecodedFileName(fileName: string): string {

        try {
            // Try UTF-8 decoding first
            const decoded = decodeURIComponent(fileName);
            return decoded;
        } catch (e) {
            console.log('UTF-8 decode failed, trying alternative methods');

            // Try different encoding approaches
            try {
                // Method 1: Using TextDecoder for UTF-8
                const decoder = new TextDecoder('utf-8');
                const encoded = new TextEncoder().encode(fileName);
                const decoded = decoder.decode(encoded);
                return decoded;
            } catch (error) {
                console.log('TextDecoder failed');
            }

            try {
                // Method 2: Escape/unescape fallback
                const decoded = decodeURIComponent(escape(fileName));
                return decoded;
            } catch (error) {
                console.log('Escape method failed');
            }

            return fileName;
        }
    }

     downloadPDF(): void {

        const decodedFileName = this.getDecodedFileName(this.file.title || 'document.pdf');

        // Use fetch to get the file with proper handling
        fetch(this.file.url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {

                const link = document.createElement('a');
                const url = window.URL.createObjectURL(blob);

                link.href = url;
                link.download = decodedFileName;
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
                console.error('Download error:', error);
                // Fallback to direct download
                const link = document.createElement('a');
                link.href = this.file.url;
                link.download = decodedFileName;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                setTimeout(() => document.body.removeChild(link), 100);
            });
    }

    generateDownloadLink(uri: string): string {
        return `${uri}?download=true`;
    }

    printPDF(): void {
        window.open(this.file.url, '_blank');
    }
}
