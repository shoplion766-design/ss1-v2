#!/bin/bash
set -e
echo "🔧 Setup SS1 Database..."
echo "Vérification que postgres tourne..."
sudo docker compose exec postgres pg_isready -U ss1_user -d ss1_db && echo "✅ DB prête" || echo "⚠️  DB pas encore prête"
echo "Application init-vouchers si besoin..."
sudo docker compose exec -T postgres psql -U ss1_user -d ss1_db < init-vouchers.sql && echo "✅ Vouchers OK" || echo "⚠️  Tables vouchers peut-être déjà créées"
echo "✅ Terminé."
