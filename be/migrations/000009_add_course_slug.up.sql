ALTER TABLE courses ADD COLUMN slug TEXT UNIQUE;

-- Populate slugs for existing courses using a combination of title and node_id if needed
-- This is a simple way to ensure uniqueness for existing data
UPDATE courses SET slug = LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTR(node_id::text, 1, 8)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE courses ALTER COLUMN slug SET NOT NULL;

-- Create index for fast lookups
CREATE INDEX idx_courses_slug ON courses(slug);
