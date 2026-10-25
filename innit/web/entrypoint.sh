#!/bin/sh
set -e

echo "=========================================="
echo "🚀 Uruchamianie serwera Tixx Web..."
echo "=========================================="

# 1. Instalacja zależności npm w kontenerze
echo "📦 [1/2] Weryfikacja i instalacja pakietów npm..."
npm install

# 2. Uruchomienie aplikacji w zależności od środowiska
echo "🌐 [2/2] Start serwera Node.js..."
if [ "$NODE_ENV" = "development" ]; then
    echo "⚡ Tryb deweloperski (auto-reload via node --watch)"
    exec npm run dev
else
    echo "⚡ Tryb produkcyjny"
    exec npm start
fi

