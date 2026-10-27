#!/bin/sh
set -e

echo "=========================================="
echo "đźš€ Uruchamianie serwera Tixx Web..."
echo "=========================================="

# 1. Instalacja zaleĹĽnoĹ›ci npm w kontenerze
echo "đź“¦ [1/2] Weryfikacja i instalacja pakietĂłw npm..."
npm install

# 2. Uruchomienie aplikacji w zaleĹĽnoĹ›ci od Ĺ›rodowiska
echo "đźŚ [2/2] Start serwera Node.js..."
if [ "$NODE_ENV" = "development" ]; then
    echo "âšˇ Tryb deweloperski (auto-reload via node --watch)"
    exec npm run dev
else
    echo "âšˇ Tryb produkcyjny"
    exec npm start
fi

