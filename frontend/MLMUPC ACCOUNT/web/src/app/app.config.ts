// ================================================================================>> Main Library
import { provideHttpClient }    from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { LuxonDateAdapter }     from '@angular/material-luxon-adapter';
import { APP_INITIALIZER, ApplicationConfig, inject, isDevMode } from '@angular/core';
import { PreloadAllModules, provideRouter, withHashLocation, withInMemoryScrolling, withPreloading } from '@angular/router';

// ================================================================================>> Third Party Library
// Material
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';

// Browser
import { provideAnimations } from '@angular/platform-browser/animations';

// RxJS
import { firstValueFrom } from 'rxjs';

// Transloco
import { TranslocoService, provideTransloco } from '@ngneat/transloco';

// ================================================================================>> Custom Library
// App
import { appRoutes } from 'app/app.routes';

// Core
import { provideAuth }          from 'app/core/auth/auth.provider';
import { provideIcons }         from 'app/core/icons/icons.provider';
import { TranslocoHttpLoader }  from 'app/core/transloco/transloco.http-loader';

// Helper
import { provideHelper } from 'helper';


export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimations(),
        provideHttpClient(),
        provideRouter(
            appRoutes,
            withPreloading(PreloadAllModules),
            withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
            withHashLocation()
        ),

        provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
        }),

        // Material Date Adapter
        {
            provide: DateAdapter,
            useClass: LuxonDateAdapter,
        },
        {
            provide: MAT_DATE_FORMATS,
            useValue: {
                parse: {
                    dateInput: 'D',
                },
                display: {
                    dateInput: 'DDD',
                    monthYearLabel: 'LLL yyyy',
                    dateA11yLabel: 'DD',
                    monthYearA11yLabel: 'LLLL yyyy',
                },
            },
        },

        // ─── OAuth2 Callback Handler ──────────────────────────────────────────
        // Runs before Angular routing initializes.
        // Keycloak redirects to http://localhost:4444/callback?code=xxx
        // We intercept here, exchange the code for a token, store it,
        // then redirect to the app using the hash router format.
        {
            provide: APP_INITIALIZER,
            useFactory: () => {
                return async () => {
                    const path   = window.location.pathname;
                    const search = window.location.search;

                    if (path !== '/callback') return;

                    const params = new URLSearchParams(search);
                    const code   = params.get('code');
                    const error  = params.get('error');

                    if (error || !code) {
                        window.location.replace('/#/auth');
                        return;
                    }

                    try {
                        const response = await fetch(
                            'http://localhost:8000/api/v1/account/auth/login/keycloak/callback',
                            {
                                method : 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body   : JSON.stringify({ code }),
                            }
                        );

                        console.log(response)

                        if (response) {
                            const data = await response.json();
                            console.log(response)
                            localStorage.setItem('accessToken',  data.access_token);
                            localStorage.setItem('refreshToken', data.refresh_token);
                            window.location.replace('/#/admin/home');
                        } else {
                            window.location.replace('/#/auth');
                        }
                    } catch {
                        window.location.replace('/#/auth');
                    }
                };
            },
            multi: true,
        },

        // Transloco Config
        provideTransloco({
            config: {
                availableLangs: [
                    {
                        id: 'kh',
                        label: 'ខ្មែរ',
                    },
                    {
                        id: 'en',
                        label: 'English',
                    },
                ],
                defaultLang: 'kh',
                fallbackLang: 'kh',
                reRenderOnLangChange: true,
                prodMode: true,
            },
            loader: TranslocoHttpLoader,
        }),
        {
            // Preload the default language before the app starts to prevent empty/jumping content
            provide: APP_INITIALIZER,
            useFactory: () => {
                const translocoService = inject(TranslocoService);
                const defaultLang = translocoService.getDefaultLang();
                translocoService.setActiveLang(defaultLang);

                return () => firstValueFrom(translocoService.load(defaultLang));
            },
            multi: true,
        },

        // Helper
        provideAuth(),
        provideIcons(),
        provideHelper({
            helper: {
                layout: 'compact',
                scheme: 'light',
                screens: {
                    sm: '600px',
                    md: '960px',
                    lg: '1280px',
                    xl: '1440px',
                },
                theme: 'theme-default',
                themes: [
                    {
                        id: 'theme-default',
                        name: 'Default',
                    },
                    {
                        id: 'theme-brand',
                        name: 'Brand',
                    },
                    {
                        id: 'theme-teal',
                        name: 'Teal',
                    },
                    {
                        id: 'theme-rose',
                        name: 'Rose',
                    },
                    {
                        id: 'theme-purple',
                        name: 'Purple',
                    },
                    {
                        id: 'theme-amber',
                        name: 'Amber',
                    },
                ],
            },
        }),
    ],
};
