# Course Platform: Admin & Content Roadmap

This roadmap focuses on building the core "Course Engine" required for the Admin Panel to manage curriculum, content, and assessments.

## Phase 1: Core Curriculum API (CRUD)
The foundation of the platform is the hierarchical `NODE` system.

- [x] **Ticket 1: Course Management API**
  - Implement `POST /api/v1/admin/courses` (Create course + node)
  - Implement `PATCH /api/v1/admin/courses/:id` (Update metadata/thumbnail)
  - Implement `DELETE /api/v1/admin/courses/:id` (Soft/Hard delete)
  - Update OpenAPI spec for Course schemas.

- [x] **Ticket 2: Curriculum Structure API (Subjects & Chapters)**
  - Implement CRUD for Subjects (`/api/v1/admin/subjects`)
  - Implement CRUD for Chapters (`/api/v1/admin/chapters`)
  - Ensure `sequence_order` management is handled correctly.
  - Implement `GET /api/v1/courses/:id/tree` for a full structural preview.

- [x] **Ticket 3: Lesson Content & Media API**
  - Implement CRUD for Lessons (`/api/v1/admin/lessons`)
  - Support `video_url` and `text_content` fields.
  - Add validation for lesson placement within chapters.

## Phase 2: Assessments & Quizzes
- [x] **Ticket 4: Quiz & Question Builder API**
  - Implement `POST /api/v1/admin/quizzes` to create a quiz.
  - Implement `POST /api/v1/admin/quizzes/:id/questions` to add questions + answers in bulk.
  - Support `SINGLE` vs `MULTIPLE` choice question types.

- [x] **Ticket 5: Quiz-Node Association**
  - Implement `POST /api/v1/admin/nodes/:id/quizzes` to attach a quiz to a specific Lesson or Chapter.
  - Implement `GET /api/v1/admin/nodes/:id/quizzes` to list attached assessments.

## Phase 3: Taxonomies & Discovery
- [x] **Ticket 6: Tagging & Categorization System**
  - Implement CRUD for Tags (`/api/v1/admin/tags`).
  - Implement `POST /api/v1/admin/nodes/:id/tags` to associate tags with courses/subjects.
  - Add slug generation for tags.

## Phase 4: Frontend Admin Foundation
- [x] **Ticket 7: Admin API Client & Schema Generation**
  - Update `be/docs/openapi.yaml` with all new Admin endpoints.
  - Run `npm run generate:api` in `/fe` to create typed hooks.
  - Set up the basic Admin Layout and Sidebar in Next.js.

- [x] **Ticket 8: Course Creation Wizard (FE)**
  - Build the multi-step form for creating a Course.
  - Implement the "Course Settings" page (Title, Thumbnail, Description).

- [ ] **Ticket 9: Curriculum Drag-and-Drop Editor (FE)**
  - Create the UI to manage the Course -> Subject -> Chapter -> Lesson hierarchy.
  - Implement reordering of items.

- [ ] **Ticket 10: Quiz Management UI (FE)**
  - Build the interface for adding questions and setting correct answers.
  - Link quizzes to curriculum nodes.
