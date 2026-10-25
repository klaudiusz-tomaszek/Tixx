-- =====================================================================
-- PROJEKT: Tixx – Portal do Obsługi Zgłoszeń IT (IT Service Desk)
-- PLIK: 02_dictionaries.sql
-- OPIS: Dane słownikowe (role, działy, kategorie, priorytety, statusy)
-- =====================================================================

BEGIN;

-- Role systemowe
INSERT INTO roles (id, name, display_name, description) VALUES
(1, 'admin', 'Administrator Systemu', 'Pełne uprawnienia do konfiguracji systemu, użytkowników i ról'),
(2, 'support', 'Specjalista Wsparcia IT', 'Dostęp do obsługi, diagnozy i rozwiązywania zgłoszeń serwisowych'),
(3, 'user', 'Użytkownik / Zgłaszający', 'Możliwość tworzenia i podglądu własnych zgłoszeń');
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- Kategorie zgłoszeń IT
INSERT INTO ticket_categories (id, name, code, description) VALUES
(1, 'Sprzęt komputerowy', 'HARDWARE', 'Awarie i zapotrzebowanie na laptopy, monitory, myszki, klawiatury itp.'),
(2, 'Oprogramowanie i licencje', 'SOFTWARE', 'Instalacja programów, błędy aplikacji biurowych, zgłoszenia licencji'),
(3, 'Konta i uprawnienia', 'ACCESS', 'Reset hasła, dostęp do zasobów sieciowych, uprawnienia w systemach ERP/CRM'),
(4, 'Sieć i łączność VPN', 'NETWORK', 'Problemy z WiFi, siecią kablową LAN lub dostępem zdalnym VPN'),
(5, 'Drukarki i skanery', 'PRINTERS', 'Zacięcia papieru, wymiana tonera, konfiguracja drukarek sieciowych'),
(6, 'Inne zgłoszenia', 'OTHER', 'Pozostałe zapytania i zgłoszenia techniczne');
SELECT setval('ticket_categories_id_seq', (SELECT MAX(id) FROM ticket_categories));

-- Priorytety zgłoszeń z czasami SLA
INSERT INTO ticket_priorities (id, name, code, sla_response_hours, sla_resolution_hours, color, sort_order) VALUES
(1, 'Niski', 'LOW', 24, 72, '#22c55e', 1),
(2, 'Średni', 'MEDIUM', 8, 24, '#38bdf8', 2),
(3, 'Wysoki', 'HIGH', 4, 8, '#f59e0b', 3),
(4, 'Krytyczny', 'CRITICAL', 1, 4, '#ef4444', 4);
SELECT setval('ticket_priorities_id_seq', (SELECT MAX(id) FROM ticket_priorities));

-- Statusy zgłoszeń
INSERT INTO ticket_statuses (id, name, code, description, is_final, color, sort_order) VALUES
(1, 'Nowe', 'NEW', 'Zgłoszenie oczekuje na weryfikację i przypisanie do technika', FALSE, '#38bdf8', 1),
(2, 'W trakcie realizacji', 'IN_PROGRESS', 'Specjalista IT pracuje nad rozwiązaniem problemu', FALSE, '#eab308', 2),
(3, 'Oczekuje na odpowiedź', 'WAITING_ON_USER', 'Wymagane dodatkowe informacje od osoby zgłaszającej', FALSE, '#a855f7', 3),
(4, 'Rozwiązane', 'RESOLVED', 'Usterka naprawiona, zgłoszenie czeka na potwierdzenie użytkownika', FALSE, '#22c55e', 4),
(5, 'Zamknięte', 'CLOSED', 'Zgłoszenie zostało pomyślnie sfinalizowane i zamknięte', TRUE, '#64748b', 5),
(6, 'Odrzucone', 'REJECTED', 'Zgłoszenie odrzucone (np. duplikat, brak uzasadnienia biznesowego)', TRUE, '#ef4444', 6);
SELECT setval('ticket_statuses_id_seq', (SELECT MAX(id) FROM ticket_statuses));

COMMIT;

