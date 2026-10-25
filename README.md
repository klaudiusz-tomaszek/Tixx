# Tixx – Portal do Obsługi Zgłoszeń IT

Projekt semestralny realizujący podstawowy portal do rejestracji, monitorowania oraz zarządzania zgłoszeniami serwisowymi IT (system ticketowy) – **Tixx**.

---

## 🎯 Cel projektu

Głównym celem projektu **Tixx** jest stworzenie prostego i funkcjonalnego systemu typu Helpdesk / Service Desk, który umożliwia:
- Rejestrowanie nowych zgłoszeń serwisowych przez użytkowników (np. problem ze sprzętem, dostępem, oprogramowaniem).
- Nadawanie zgłoszeniom priorytetów (niski, średni, wysoki, krytyczny) oraz kategorii.
- Śledzenie statusów zgłoszeń (np. *Nowe*, *W trakcie realizacji*, *Rozwiązane*, *Zamknięte*).
- Zarządzanie zgłoszeniami przez administratorów/pracowników wsparcia IT.
- Przechowywanie danych w relacyjnej bazie danych PostgreSQL.

---

## 🛠️ Technologie i architektura

- **Baza danych:** PostgreSQL
- **Panel zarządzania bazą:** Adminer (webowy interfejs do podglądu i zarządzania tabelami)
- **Aplikacja webowa (Backend & Frontend):** Node.js + Express
- **Konteneryzacja:** Docker & Docker Compose

---

## 🚀 Uruchomienie projektu

1. Uruchomienie wszystkich serwisów za pomocą Docker Compose (z głównego katalogu):
   ```bash
   docker compose -f innit/docker/docker-compose.yml up -d
   ```
   *Alternatywnie możesz wejść do katalogu `innit/docker` i wykonać `docker compose up -d`.*

2. Dostęp do usług w przeglądarce:
   - **Aplikacja Webowa:** [http://localhost:3000](http://localhost:3000)
   - **Adminer (baza danych):** [http://localhost:8080](http://localhost:8080)
