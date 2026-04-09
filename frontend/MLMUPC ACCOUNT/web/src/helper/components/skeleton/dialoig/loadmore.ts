
// ================================================================================>> Core Library
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'list-skeleton-load-more-dialog',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="h-[calc(100vh-9rem)] overflow-hidden animate-pulse border-t px-4">
        <!-- Table Header -->
        <div class="h-14 flex items-center border-b p-2">
            <!-- Number Column Title -->
            <div class="w-100 pl-2">
                <div class="w-14 h-4 bg-gray-300 rounded-full"></div>
            </div>

        </div>

        <!-- Table Rows -->
        <div *ngFor="let box of boxes" class="flex items-center border-b p-2">
            <!-- Number Column -->
            <div class="w-100 pl-2">
                <div class="w-20 h-4 bg-gray-200 rounded-full"></div>
            </div>

            <!-- Name Column -->
            <div class="flex items-center justify-end mx-4 flex-grow gap-4">
                <div class="w-11 h-11 bg-gray-200 rounded-full"></div>
            </div>

        </div>
    </div>
    `
})
export class LoadMoreDialogComponent implements OnInit {
    boxes = [];

    ngOnInit() {
        // generate 50 rows
        this.boxes = Array.from({ length: 5 }, () => this.generateBox());
    }

    private generateBox() {
        return {
            nameWidth: this.getRandomWidth(40, 80),
            subNameWidth: this.getRandomWidth(30, 60),
        };
    }

    private getRandomWidth(min: number, max: number): string {
        const randomPercentage = Math.floor(Math.random() * (max - min + 1)) + min;
        return `${randomPercentage}%`;
    }
}
