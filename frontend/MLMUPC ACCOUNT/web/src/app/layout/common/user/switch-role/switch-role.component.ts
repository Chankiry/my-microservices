import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, HostBinding, inject, Input, OnChanges, OnDestroy, Renderer2, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { UserService } from 'app/core/user/user.service';
import { Role } from 'app/core/user/user.types';
import { env } from 'envs/env';
import { RoleEnum } from 'helper/enums/role.enum';
import { UserPayload } from 'helper/interfaces/payload.interface';
import { SnackbarService } from 'helper/services/snack-bar/snack-bar.service';
import GlobalConstants from 'helper/shared/constants';
import { jwtDecode } from 'jwt-decode';

@Component({
    selector: 'user-switch-role',
    templateUrl: './switch-role.component.html',
    styleUrls: ['./switch-role.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        MatIconModule,
        MatButtonModule,
        FormsModule,
        MatMenuModule,
        MatDividerModule,
    ]
})
export class SwitchRoleComponent implements OnChanges, OnDestroy {

    @Input() roles: Role[] = [];

    private _canClick: boolean = true;
    private _opened: boolean = false;
    private _handleOverlayClick: any;
    private _overlay: HTMLElement;
    private _player: AnimationPlayer;

    constructor(
        private _animationBuilder: AnimationBuilder,
        private _elementRef: ElementRef,
        private _renderer2: Renderer2,
        private _httpClient: HttpClient,
        private _snackbar: SnackbarService,
        private _router: Router
    ) {
        this._handleOverlayClick = (): void => {
            if (this._canClick) this.close();
        };
    }
    //=======================================================================
    authService = inject(AuthService);
    userService = inject(UserService);
    navigationService = inject(NavigationService);
    // notificationsService = inject(NotificationsService);
    setActive(role: Role): void {
        this._canClick = false;
        this._httpClient.post<any>(`${env.API_BASE_URL}/account/auth/switch`, { role_id: role.id }).subscribe({
            next: res => {
                this._canClick = true;
                this.authService.accessToken = res.access_token;
                const tokenPayload: UserPayload = jwtDecode(res.access_token);
                this.userService.user = tokenPayload.user;
                const role = tokenPayload.user?.roles?.find(role => role.is_default);
                if (!role) {
                    localStorage.clear();
                    return this._router.navigateByUrl('');
                }
                this.navigationService.navigations = role;
                // this.notificationsService.getAll();
                if (role.name_kh === RoleEnum.ADMIN) {
                    this._router.navigateByUrl('/admin/dashboard')
                } else if (role.name_kh === RoleEnum.VOLUNTEER) {
                    this._router.navigateByUrl('/volunteer/dashboard')
                } else if (role.name_kh === RoleEnum.USER) {
                    this._router.navigateByUrl('/user/dashboard')
                }
                else {
                    this._router.navigateByUrl('');
                }
                window.location.reload();
                this.close();
            },
            error: err => {
                this._canClick = true;
                const errors: { field: string, message: string }[] | undefined = err.error.errors;
                let message: string = err.error.message ?? GlobalConstants.genericError;
                if (errors && errors.length > 0) {
                    message = errors.map((obj) => obj.message).join(', ')
                }
                this._snackbar.openSnackBar(message, GlobalConstants.error);
            }
        })
    }


    //=======================================================================
    /**
     * Host binding for component classes
     */
    @HostBinding('class') get classList(): any {
        return {
            'user-switch-role-animations-enabled': true,
            'user-switch-role-fixed': true,
            'user-switch-role-mode-over': true,
            'user-switch-role-opened': this._opened,
            'user-switch-role-position-right': true
        };
    }

    /**
     * Host binding for component inline styles
     */
    @HostBinding('style') get styleList(): any {
        return {
            'visibility': this._opened ? 'visible' : 'hidden',
        };
    }

    /**
     * On changes
     *
     * @param changes
     */
    ngOnChanges(changes: SimpleChanges): void {

        // Mode
        if ('mode' in changes) {
            // Get the previous and current values
            const previousMode = changes.mode.previousValue;
            const currentMode = changes.mode.currentValue;

            // If the mode changes: 'over -> side'
            if (previousMode === 'over' && currentMode === 'side') {
                // Hide the overlay
                this._hideOverlay();
            }

            // If the mode changes: 'side -> over'
            if (previousMode === 'side' && currentMode === 'over') {
                // If the drawer is opened
                if (this._opened) {
                    // Show the overlay
                    this._showOverlay();
                }
            }
        }

        // Opened
        if ('opened' in changes) {
            // Coerce the value to a boolean
            const open = coerceBooleanProperty(changes.opened.currentValue);

            // Open/close the drawer
            this._toggleOpened(open);
        }
    }

    ngOnDestroy(): void {
        // Finish the animation
        if (this._player) {
            this._player.finish();
        }
    }

    open(): void {
        // Return if the drawer has already opened
        if (this._opened) {
            return;
        }
        // Open the drawer
        this._toggleOpened(true);
    }

    close(): void {
        // Return if the drawer has already closed
        if (!this._opened) {
            return;
        }
        // Close the drawer
        this._toggleOpened(false);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------
    private _showOverlay(): void {
        // Create the backdrop element
        this._overlay = this._renderer2.createElement('div');

        // Add a class to the backdrop element
        this._overlay.classList.add('user-switch-role-overlay');

        // Add a class depending on the fixed option
        this._overlay.classList.add('user-switch-role-overlay-fixed');

        // Append the backdrop to the parent of the drawer
        this._renderer2.appendChild(this._elementRef.nativeElement.parentElement, this._overlay);

        // Create enter animation and attach it to the player
        this._player = this._animationBuilder.build([
            style({ opacity: 0 }),
            animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ opacity: 1 })),
        ]).create(this._overlay);

        // Play the animation
        this._player.play();

        // Add an event listener to the overlay
        this._overlay.addEventListener('click', this._handleOverlayClick);
    }

    private _hideOverlay(): void {
        if (!this._overlay) {
            return;
        }

        // Create the leave animation and attach it to the player
        this._player = this._animationBuilder.build([
            animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ opacity: 0 })),
        ]).create(this._overlay);

        // Play the animation
        this._player.play();

        // Once the animation is done...
        this._player.onDone(() => {
            // If the overlay still exists...
            if (this._overlay) {
                // Remove the event listener
                this._overlay.removeEventListener('click', this._handleOverlayClick);
                // Remove the overlay
                this._overlay.parentNode.removeChild(this._overlay);
                this._overlay = null;
            }
        });
    }

    private _toggleOpened(open: boolean): void {
        // Set the opened
        this._opened = open;

        // If the drawer opens, show the overlay
        if (open) {
            this._showOverlay();
        }
        // Otherwise, close the overlay
        else {
            this._hideOverlay();
        }
    }
}
