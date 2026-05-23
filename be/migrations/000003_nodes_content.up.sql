-- Create Node Type Enum
CREATE TYPE node_type AS ENUM ('COURSE', 'SUBJECT', 'CHAPTER', 'LESSON');

-- Nodes Table (Base Table for Hierarchy)
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    node_type node_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses Table
CREATE TABLE courses (
    node_id UUID PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT FALSE
);

-- Subjects Table
CREATE TABLE subjects (
    node_id UUID PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sequence_order INT NOT NULL
);

-- Chapters Table
CREATE TABLE chapters (
    node_id UUID PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sequence_order INT NOT NULL
);

-- Lessons Table
CREATE TABLE lessons (
    node_id UUID PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    text_content TEXT,
    video_url TEXT,
    sequence_order INT NOT NULL
);

-- Node Prerequisites Table
CREATE TABLE node_prerequisites (
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    prerequisite_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    PRIMARY KEY (node_id, prerequisite_node_id)
);

-- Indexes
CREATE INDEX idx_nodes_parent_id ON nodes(parent_id);
CREATE INDEX idx_nodes_node_type ON nodes(node_type);
