# IT Service Desk – Portal do Obsługi Zgłoszeń IT

Projekt semestralny realizujący podstawowy portal do rejestracji, monitorowania oraz zarządzania zgłoszeniami serwisowymi IT (system ticketowy).

---

## 🎯 Cel projektu

Głównym celem projektu jest stworzenie prostego i funkcjonalnego systemu typu Helpdesk/Service Desk, który umożliwia:
- Rejestrowanie nowych zgłoszeń serwisowych przez użytkowników (np. problem ze sprzętem, dostępem, oprogramowaniem).
- Nadawanie zgłoszeniom priorytetów (niski, średni, wysoki, krytyczny) oraz kategorii.
- Śledzenie statusów zgłoszeń (np. *Nowe*, *W trakcie realizacji*, *Rozwiązane*, *Zamknięte*).
- Zarządzanie zgłoszeniami przez administratorów/pracowników wsparcia IT.
- Przechowywanie danych w relacyjnej bazie danych PostgreSQL.

---

## 🛠️ Technologie i architektura

- **Baza danych:** PostgreSQL
- **Panel zarządzania bazą:** Adminer (webowy interfejs do podglądu i zarządzania tabelami)
- **Konteneryzacja:** Docker & Docker Compose

---