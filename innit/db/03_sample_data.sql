-- =====================================================================
-- PROJEKT: Tixx – Portal do Obsługi Zgłoszeń IT (IT Service Desk)
-- PLIK: 03_sample_data.sql
-- OPIS: Przykładowe dane testowe (użytkownicy, zgłoszenia, komentarze, audyt)
-- =====================================================================

BEGIN;

-- Użytkownicy (Hasło testowe dla wszystkich: password123 / bcrypt)
INSERT INTO users (id, role_id, department, first_name, last_name, email, password_hash, phone_number, office_room) VALUES
(1, 1, 'IT i Infrastruktura', 'Jan', 'Kowalski', 'admin@tixx.local', '$2a$10$wK1Gq0c0rYjP5wLqJ9kOauF5q9o1p6eN.Fp5E4/rG3oKqK6G0c1u2', '+48 501 100 200', 'Serwerownia / B-101'),
(2, 2, 'IT i Infrastruktura', 'Tomasz', 'Zieliński', 't.zielinski@tixx.local', '$2a$10$wK1Gq0c0rYjP5wLqJ9kOauF5q9o1p6eN.Fp5E4/rG3oKqK6G0c1u2', '+48 501 100 201', 'Helpdesk / B-102'),
(3, 2, 'IT i Infrastruktura', 'Anna', 'Nowicka', 'a.nowicka@tixx.local', '$2a$10$wK1Gq0c0rYjP5wLqJ9kOauF5q9o1p6eN.Fp5E4/rG3oKqK6G0c1u2', '+48 501 100 202', 'Helpdesk / B-102'),
(4, 3, 'Księgowość i Finanse', 'Piotr', 'Wiśniewski', 'p.wisniewski@tixx.local', '$2a$10$wK1Gq0c0rYjP5wLqJ9kOauF5q9o1p6eN.Fp5E4/rG3oKqK6G0c1u2', '+48 502 200 301', 'Biuro 204'),
(5, 3, 'Human Resources', 'Magdalena', 'Dąbrowska', 'm.dabrowska@tixx.local', '$2a$10$wK1Gq0c0rYjP5wLqJ9kOauF5q9o1p6eN.Fp5E4/rG3oKqK6G0c1u2', '+48 502 200 302', 'Biuro 310'),
(6, 3, 'Marketing i Sprzedaż', 'Michał', 'Kozłowski', 'm.kozlowski@tixx.local', '$2a$10$wK1Gq0c0rYjP5wLqJ9kOauF5q9o1p6eN.Fp5E4/rG3oKqK6G0c1u2', '+48 502 200 303', 'Open Space A'),
(7, 3, 'Logistyka i Magazyn', 'Ewa', 'Wójcik', 'e.wojcik@tixx.local', '$2a$10$wK1Gq0c0rYjP5wLqJ9kOauF5q9o1p6eN.Fp5E4/rG3oKqK6G0c1u2', '+48 502 200 304', 'Magazyn Główny');
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Zgłoszenia serwisowe (Tickets)
INSERT INTO tickets (id, ticket_number, title, description, category_id, priority_id, status_id, reporter_id, assignee_id, due_date, resolved_at, closed_at, created_at, updated_at) VALUES
(
    1,
    'TIXX-2026-0001',
    'Błąd logowania do systemu ERP po resecie hasła',
    'Dzień dobry, po wczorajszej zmianie hasła domenowego nie mogę zalogować się do systemu Symfonia ERP. Wyświetla się komunikat o nieprawidłowych poświadczeniach.',
    3, -- Konta i uprawnienia
    3, -- Wysoki
    2, -- W trakcie realizacji
    4, -- Piotr Wiśniewski (Księgowość)
    2, -- Tomasz Zieliński (IT)
    CURRENT_TIMESTAMP + INTERVAL '8 hours',
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '3 hours',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
),
(
    2,
    'TIXX-2026-0002',
    'Cykliczny Blue Screen (BSOD) w trakcie spotkań na Teams',
    'Laptop ThinkPad T14 wyłącza się z błędem VIDEO_DXGKRNL_FATAL_ERROR podczas udostępniania ekranu na wideokonferencjach z klientami. Zdarzyło się to już 3 razy dzisiaj.',
    1, -- Sprzęt komputerowy
    4, -- Krytyczny
    2, -- W trakcie realizacji
    6, -- Michał Kozłowski (Sprzedaż)
    3, -- Anna Nowicka (IT)
    CURRENT_TIMESTAMP + INTERVAL '2 hours',
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes'
),
(
    3,
    'TIXX-2026-0003',
    'Wymiana tonera i konserwacja drukarki w dziale HR',
    'Drukarka HP LaserJet Pro na 3. piętrze (pokój 310) sygnalizuje bardzo niski poziom czarnego tonera (poniżej 5%) oraz pozostawia ciemne smugi na marginesach kartek.',
    5, -- Drukarki i skanery
    1, -- Niski
    1, -- Nowe
    5, -- Magdalena Dąbrowska (HR)
    NULL,
    CURRENT_TIMESTAMP + INTERVAL '48 hours',
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '5 hours',
    CURRENT_TIMESTAMP - INTERVAL '5 hours'
),
(
    4,
    'TIXX-2026-0004',
    'Prośba o dostęp do dysku sieciowego Magazynu (Z:\\Dane_Logistyka)',
    'Proszę o nadanie uprawnień do zapisu dla nowo wdrożonego pracownika w folderze współdzielonym Logistyki.',
    3, -- Konta i uprawnienia
    2, -- Średni
    3, -- Oczekuje na odpowiedź
    7, -- Ewa Wójcik (Logistyka)
    2, -- Tomasz Zieliński (IT)
    CURRENT_TIMESTAMP + INTERVAL '18 hours',
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '4 hours'
),
(
    5,
    'TIXX-2026-0005',
    'Brak możliwości połączenia z VPN z domowego łącza światłowodowego',
    'Klient OpenVPN wyrzuca komunikat: TLS Error: TLS handshake failed. Próba łączenia zarówno po UDP jak i TCP kończy się timeoutem.',
    4, -- Sieć i łączność VPN
    3, -- Wysoki
    4, -- Rozwiązane
    4, -- Piotr Wiśniewski (Księgowość)
    2, -- Tomasz Zieliński (IT)
    CURRENT_TIMESTAMP - INTERVAL '12 hours',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
),
(
    6,
    'TIXX-2026-0006',
    'Instalacja pakietu Figma Desktop na stacji roboczej',
    'Dzień dobry, potrzebuję aplikacji Figma Desktop do przygotowywania materiałów do nowej kampanii marketingowej.',
    2, -- Oprogramowanie i licencje
    2, -- Średni
    5, -- Zamknięte
    6, -- Michał Kozłowski (Sprzedaż)
    3, -- Anna Nowicka (IT)
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);
SELECT setval('tickets_id_seq', (SELECT MAX(id) FROM tickets));

-- Komentarze w zgłoszeniach
INSERT INTO ticket_comments (id, ticket_id, author_id, message, is_internal, created_at) VALUES
(
    1,
    1,
    2,
    'Dzień dobry panie Piotrze, sprawdzam stan konta w Active Directory oraz synchronizację z bazą Symfonii.',
    FALSE,
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
),
(
    2,
    1,
    2,
    'Notatka wewnętrzna: Użytkownik miał zablokowane konto z powodu 3 błędnych prób logowania. Wyczyszczono flagę lockout w AD.',
    TRUE,
    CURRENT_TIMESTAMP - INTERVAL '1 hour 45 minutes'
),
(
    3,
    1,
    4,
    'Dziękuję za szybką reakcję, czekam na informację kiedy mogę ponowić próbę.',
    FALSE,
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
),
(
    4,
    2,
    3,
    'Panie Michale, podejrzewam konflikt najnowszej aktualizacji sterowników graficznych Intel Iris Xe. Proszę o nieinstalowanie zewnętrznych narzędzi do czasu zakończenia zdalnej diagnostyki.',
    FALSE,
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
),
(
    5,
    4,
    2,
    'Pani Ewo, proszę o podanie imienia, nazwiska oraz loginu domenowego nowego pracownika celem dodania do grupy uprawnień AD.',
    FALSE,
    CURRENT_TIMESTAMP - INTERVAL '4 hours'
),
(
    6,
    5,
    2,
    'Certyfikat klienta OpenVPN został odświeżony i wygenerowany na nowo. Plik konfiguracyjny wysłano na maila służbowego.',
    FALSE,
    CURRENT_TIMESTAMP - INTERVAL '1 hour 15 minutes'
),
(
    7,
    5,
    4,
    'Potwierdzam, połączenie z VPN działa stabilnie. Dziękuję!',
    FALSE,
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
),
(
    8,
    6,
    3,
    'Aplikacja Figma została zainstalowana zdalnie przez pulpit zdalny. Sprawa rozwiązana.',
    FALSE,
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);
SELECT setval('ticket_comments_id_seq', (SELECT MAX(id) FROM ticket_comments));

-- Dziennik audytu / Historia zmian
INSERT INTO ticket_history (id, ticket_id, changed_by_id, field_name, old_value, new_value, created_at) VALUES
(1, 1, 2, 'assignee_id', NULL, 'Tomasz Zieliński', CURRENT_TIMESTAMP - INTERVAL '2 hours 30 minutes'),
(2, 1, 2, 'status_id', 'Nowe', 'W trakcie realizacji', CURRENT_TIMESTAMP - INTERVAL '2 hours 30 minutes'),
(3, 2, 3, 'assignee_id', NULL, 'Anna Nowicka', CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes'),
(4, 2, 3, 'status_id', 'Nowe', 'W trakcie realizacji', CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes'),
(5, 4, 2, 'status_id', 'Nowe', 'Oczekuje na odpowiedź', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
(6, 5, 2, 'status_id', 'W trakcie realizacji', 'Rozwiązane', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
(7, 6, 3, 'status_id', 'Rozwiązane', 'Zamknięte', CURRENT_TIMESTAMP - INTERVAL '1 day');
SELECT setval('ticket_history_id_seq', (SELECT MAX(id) FROM ticket_history));

COMMIT;

COMMIT;