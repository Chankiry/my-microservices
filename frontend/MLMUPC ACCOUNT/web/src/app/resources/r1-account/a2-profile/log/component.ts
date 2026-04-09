// ================================================================================>> Core Library
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

// ================================================================================>> Third Party Library
// Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

// ================================================================================>> Custom Library
// Service
import { ProfileService } from '../profile.service';

// Type
import { Data, List } from '../profile.type';
import { ErrorHandleService } from 'app/shared/error-handle.service';

@Component({
    selector    : 'profile-log',
    standalone  : true,
    templateUrl : './template.html',
    styleUrl    : './style.scss',
    imports     : [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatPaginatorModule,
        MatProgressSpinner
    ]
})

export class ProfileLogComponent implements OnInit {

    public displayedColumns : string[] = ['no', 'type', 'ip', 'date', 'time'];
    public dataSource       : MatTableDataSource<Data> = new MatTableDataSource<Data>([]);

    public total            : number = 10;
    public limit            : number = 10;
    public page             : number = 1;
    public key              : string = '';

    public isLoading        : boolean = false;

    constructor(
        private _service: ProfileService,
        private _errorHandleService : ErrorHandleService
    ) { }

    ngOnInit(): void {
        this.list(this.page, this.limit)
    }

    list(_page: number = 1, _page_size: number = 10,): void {

        const params: { page: number, page_size: number} = {
            page: _page,
            page_size: _page_size,
        };

        this.isLoading = true;

        this._service.list(params).subscribe({
            next: (res: List) => {
                this.dataSource.data = res.data;
                this.total = res.pagination.total_items;
                this.limit = res.pagination.per_page;
                this.page = res.pagination.current_page;

                this.isLoading = false;
            },
            error: (err: HttpErrorResponse) => {
                this._errorHandleService.handleHttpError(err)
                this.isLoading = false;
            }

        });

    }

    onPageChanged(event: PageEvent): void {
        this.limit = event.pageSize;
        this.page = event.pageIndex + 1;
        this.list(this.page, this.limit);
    }
}
