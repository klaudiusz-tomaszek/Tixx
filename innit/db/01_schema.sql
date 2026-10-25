-- =====================================================================
-- PROJEKT: Tixx – Portal do Obsługi Zgłoszeń IT (IT Service Desk)
-- PLIK: 01_schema.sql
-- OPIS: Definicja struktury bazy danych (funkcje, tabele, indeksy, widoki)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. CZYSZCZENIE STRUKTURY
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_tickets_overview CASCADE;
DROP TABLE IF EXISTS ticket_attachments CASCADE;
DROP TABLE IF EXISTS ticket_history CASCADE;
DROP TABLE IF EXISTS ticket_comments CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS ticket_statuses CASCADE;
DROP TABLE IF EXISTS ticket_priorities CASCADE;
DROP TABLE IF EXISTS ticket_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP SEQUENCE IF EXISTS ticket_number_seq CASCADE;

-- ---------------------------------------------------------------------
-- 2. FUNKCJE POMOCNICZE I TRIGGERY
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 3. TABELE SŁOWNIKOWE I UŻYTKOWNICY
-- ---------------------------------------------------------------------

-- Role w systemie (Administrator, Technik IT, Użytkownik)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Użytkownicy systemu
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    department VARCHAR(100),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(30),
    office_room VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Kategorie zgłoszeń IT
CREATE TABLE ticket_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Priorytety zgłoszeń
CREATE TABLE ticket_priorities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    sla_response_hours INT NOT NULL,
    sla_resolution_hours INT NOT NULL,
    color VARCHAR(20) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Statusy zgłoszeń
CREATE TABLE ticket_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(30) NOT NULL UNIQUE,
    description TEXT,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    color VARCHAR(20) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 4. GŁÓWNA TABELA ZGŁOSZEŃ (TICKETS)
-- ---------------------------------------------------------------------
CREATE SEQUENCE ticket_number_seq START 1001;

CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(30) NOT NULL UNIQUE DEFAULT ('TIXX-2026-' || LPAD(nextval('ticket_number_seq')::TEXT, 4, '0')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id INT NOT NULL REFERENCES ticket_categories(id) ON DELETE RESTRICT,
    priority_id INT NOT NULL REFERENCES ticket_priorities(id) ON DELETE RESTRICT,
    status_id INT NOT NULL REFERENCES ticket_statuses(id) ON DELETE RESTRICT,
    reporter_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assignee_id INT REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- 5. TABELE POWIĄZANE ZE ZGŁOSZENIEM
-- ---------------------------------------------------------------------

-- Komentarze i dyskusje
CREATE TABLE ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_ticket_comments_updated_at
BEFORE UPDATE ON ticket_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Historia zmian / audyt
CREATE TABLE ticket_history (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    changed_by_id INT REFERENCES users(id) ON DELETE SET NULL,
    field_name VARCHAR(50) NOT NULL,
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 6. INDEKSY
-- ---------------------------------------------------------------------
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_department ON users(department);

CREATE INDEX idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_status_id ON tickets(status_id);
CREATE INDEX idx_tickets_priority_id ON tickets(priority_id);
CREATE INDEX idx_tickets_category_id ON tickets(category_id);
CREATE INDEX idx_tickets_reporter_id ON tickets(reporter_id);
CREATE INDEX idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);

CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_history_ticket_id ON ticket_history(ticket_id);

-- ---------------------------------------------------------------------
-- 7. WIDOK PRZEGLĄDU ZGŁOSZEŃ (VIEW)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_tickets_overview AS
SELECT 
    t.id,
    t.ticket_number,
    t.title,
    t.description,
    c.name AS category_name,
    p.name AS priority_name,
    p.code AS priority_code,
    p.color AS priority_color,
    s.name AS status_name,
    s.code AS status_code,
    s.color AS status_color,
    s.is_final AS is_closed,
    rep.id AS reporter_id,
    rep.first_name || ' ' || rep.last_name AS reporter_name,
    rep.email AS reporter_email,
    rep.department AS reporter_department,
    ass.id AS assignee_id,
    CASE 
        WHEN ass.id IS NOT NULL THEN ass.first_name || ' ' || ass.last_name 
        ELSE NULL 
    END AS assignee_name,
    ass.email AS assignee_email,
    t.due_date,
    t.resolved_at,
    t.closed_at,
    t.created_at,
    t.updated_at,
    (SELECT COUNT(*) FROM ticket_comments tc WHERE tc.ticket_id = t.id) AS comments_count
FROM tickets t
JOIN ticket_categories c ON t.category_id = c.id
JOIN ticket_priorities p ON t.priority_id = p.id
JOIN ticket_statuses s ON t.status_id = s.id
JOIN users rep ON t.reporter_id = rep.id
LEFT JOIN users ass ON t.assignee_id = ass.id;

COMMIT;
