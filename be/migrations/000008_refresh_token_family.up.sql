ALTER TABLE refresh_tokens ADD COLUMN family_id UUID NOT NULL DEFAULT uuid_generate_v4();
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);
