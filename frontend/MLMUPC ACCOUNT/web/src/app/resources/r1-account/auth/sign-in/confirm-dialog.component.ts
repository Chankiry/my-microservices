import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmColor?: 'primary' | 'accent' | 'warn';
}

@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
        <div class="p-0">
            <!-- Header -->
            <div class="flex items-center gap-3 p-6 pb-4 border-b border-gray-200">
                <div class="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                    <mat-icon class="text-red-600" svgIcon="mdi:alert-circle"></mat-icon>
                </div>
                <h2 mat-dialog-title class="text-lg font-semibold text-gray-800 m-0">
                    {{ data.title }}
                </h2>
            </div>

            <!-- Content -->
            <div class="px-6 py-4">
                <p class="text-sm text-gray-600 leading-relaxed">
                    {{ data.message }}
                </p>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button mat-stroked-button (click)="onCancel()" class="border-gray-300 text-gray-600">
                    {{ data.cancelLabel || 'បោះបង់' }}
                </button>
                <button
                    mat-flat-button
                    [color]="data.confirmColor || 'primary'"
                    (click)="onConfirm()"
                    class="bg-red-600 text-white hover:bg-red-700">
                    {{ data.confirmLabel || 'យល់ព្រម' }}
                </button>
            </div>
        </div>
    `,
    styles: [`
        :host {
            display: block;
        }
    `],
})
export class ConfirmDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
    ) {}

    onConfirm(): void {
        this.dialogRef.close(true);
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }
}
