-- Band magic link tokens for passwordless band auth
CREATE TABLE band_magic_tokens (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    band_id INTEGER NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_band_magic_tokens_token ON band_magic_tokens(token);
CREATE INDEX idx_band_magic_tokens_band_id ON band_magic_tokens(band_id);
