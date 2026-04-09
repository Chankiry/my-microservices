-- ═══════════════════════════════════════════════════════════════════════
-- PLT — External Provider Integration Migration
-- Run this once against PLT's database
-- ═══════════════════════════════════════════════════════════════════════


-- ─── 1. account_providers ────────────────────────────────────────────────────
-- One row per external identity provider PLT integrates with.
-- Currently: MLMUPC Account. Future: CamDigiKey, etc.

CREATE TABLE account_providers (
    id              VARCHAR(50)  PRIMARY KEY,          -- e.g. 'mlmupc-account', 'camdigitkey'
    name_kh         VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100) NOT NULL,
    logo_url        VARCHAR(500),                       -- provider logo shown in PLT UI
    -- URLs on the PROVIDER side that PLT calls --
    jwks_url        VARCHAR(500),                       -- provider's public key endpoint (PLT caches this)
    notify_url      VARCHAR(500),                       -- provider's link-notify endpoint
    auth_url        VARCHAR(500),                       -- OAuth2 auth URL (CamDigiKey, etc.)
    token_url       VARCHAR(500),                       -- OAuth2 token exchange URL
    -- Internal secret for server-to-server calls --
    internal_secret VARCHAR(200),                       -- PLT sends this in x-internal-secret header
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);


-- ─── 2. account_links ────────────────────────────────────────────────────────
-- One row per (user, provider) pair.
-- external_id = the user's ID as known by the external provider
--   For MLMUPC Account: external_id = Account Platform's user.id (UUID)
-- roles_snapshot = the user's roles in PLT at link time (pending sync)

CREATE TABLE account_links (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id         VARCHAR(50)  NOT NULL REFERENCES account_providers(id),
    external_id         VARCHAR(100) NOT NULL,          -- user's ID in the external provider
    status              VARCHAR(20)  NOT NULL DEFAULT 'active',  -- active | pending | revoked
    roles_snapshot      JSONB        NOT NULL DEFAULT '[]',      -- [{ id, slug, name_kh, name_en }]
    roles_sync_status   VARCHAR(20)  NOT NULL DEFAULT 'pending', -- pending | synced
    linked_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, provider_id),      -- one link per user per provider
    UNIQUE (provider_id, external_id)   -- one PLT user per external identity
);

CREATE INDEX idx_account_links_external ON account_links (provider_id, external_id);
CREATE INDEX idx_account_links_user     ON account_links (user_id, status);


-- ─── 3. jwks_cache ───────────────────────────────────────────────────────────
-- Caches the JWKS (public keys) per provider.
-- PLT validates provider JWTs locally using these keys — no HTTP call per request.

CREATE TABLE jwks_cache (
    provider_id VARCHAR(50)  PRIMARY KEY REFERENCES account_providers(id),
    keys        JSONB        NOT NULL,                  -- { keys: [JWK, ...] }
    fetched_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMP    NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);


-- ─── Seed: MLMUPC Account provider ───────────────────────────────────────────
-- Adjust the URLs to match your actual environment.

INSERT INTO account_providers (
    id, name_kh, name_en, logo_url,
    jwks_url, notify_url,
    auth_url, token_url,
    internal_secret, is_active
) VALUES (
    'mlmupc-account-system',
    'គណនីឌីជីថល',
    'MLMUPC ACCOUNT SYSTEM',
    null,
    'http://localhost:8000/api/v1/account/auth/jwks',
    'http://localhost:8000/api/v1/account/auth/link/notify',
    NULL,   -- MLMUPC Account uses redirect-based linking, not OAuth2
    NULL,
    'shared-secret',   -- must match INTERNAL_SERVICE_SECRET on the Account Platform
    TRUE
) ON CONFLICT (id) DO NOTHING;


-- ─── Future seed example: CamDigiKey ─────────────────────────────────────────
-- INSERT INTO account_providers (
--     id, name_kh, name_en, logo_url,
--     jwks_url, auth_url, token_url,
--     internal_secret, is_active
-- ) VALUES (
--     'camdigitkey', 'គម្ពីជីគី', 'CamDigiKey',
--     'https://camdigitkey.gov.kh/logo.png',
--     'https://camdigitkey.gov.kh/.well-known/jwks.json',
--     'https://camdigitkey.gov.kh/oauth/authorize',
--     'https://camdigitkey.gov.kh/oauth/token',
--     NULL,
--     FALSE   -- enable when ready
-- );
