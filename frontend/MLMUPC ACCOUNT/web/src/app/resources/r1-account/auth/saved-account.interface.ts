// Stored in localStorage key: 'savedPlatformAccounts'
// Only profile data — no tokens

export interface SavedAccount {
    phone    : string;   // used as login identifier
    name     : string;   // display name
    email    : string;   // display email
    avatar   : string;   // avatar URL or empty string
    last_used: number;   // timestamp for sorting
}

export const SAVED_ACCOUNTS_KEY   = 'savedPlatformAccounts';
export const CURRENT_ACCOUNT_KEY  = 'currentAccountPhone';

export function getSavedAccounts(): SavedAccount[] {
    try {
        const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveAccount(account: SavedAccount): void {
    // Always keep only 1 — the most recently used account
    const latest = { ...account, last_used: Date.now() };
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify([latest]));
    localStorage.setItem(CURRENT_ACCOUNT_KEY, account.phone);
}

export function removeAccount(phone: string): void {
    const accounts = getSavedAccounts().filter(a => a.phone !== phone);
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
    if (localStorage.getItem(CURRENT_ACCOUNT_KEY) === phone) {
        localStorage.removeItem(CURRENT_ACCOUNT_KEY);
    }
}

export function setCurrentAccount(phone: string): void {
    localStorage.setItem(CURRENT_ACCOUNT_KEY, phone);
}

export function getCurrentAccountPhone(): string | null {
    return localStorage.getItem(CURRENT_ACCOUNT_KEY);
}
