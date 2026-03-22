import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
    standalone: true,
    imports: [MatIconModule],
    selector: 'no-data-component',
    template: `
        <div class="flex flex-col justify-center items-center mb-4">
        <img [src]="'images/avatars/' + type + '.png'"
            alt="No data"
            class="w-28 h-28">
        <span class="text-[24px] -mt-2 text-slate-300">គ្មានទិន្នន័យ</span>
        </div>
    `
})
export class NoDataComponent {
    @Input() type: 'user' | 'file' | 'chat' | 'search' | 'study' = 'user';
}
