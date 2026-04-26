# SS1 Platform — ss1

Architecture microservices complète pour la gestion du réseau d'affiliation SS1.

## Stack

| Couche | Technologie |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Gateway | Express.js (API Gateway + Auth middleware) |
| Auth Service | Express.js + JWT + bcrypt |
| Affiliate Service | Express.js + PostgreSQL |
| Admin Service | Express.js + PostgreSQL |
| Base de données | PostgreSQL 16 |
| Cache | Redis 7 |
| Orchestration | Docker Compose |

## Lancement rapide

```bash
# 1. Cloner et entrer dans le projet
cd ss1-platform

# 2. Lancer tous les services
docker compose up -d

# 3. Accéder à l'application
# Frontend :  http://localhost:3000
# Gateway :   http://localhost:4000
# Auth :      http://localhost:3001
# Affiliate : http://localhost:3002
# Admin :     http://localhost:3003

# Compte admin par défaut :
# Email :    admin@ss1.local
# Password : Admin@SS12024!
```

## Structure

```
ss1-platform/
├── docker-compose.yml
├── init.sql                    # Schéma PostgreSQL complet
├── services/
│   ├── auth/                   # JWT auth, register, login
│   ├── affiliate/              # Dashboard, referrals, earnings
│   └── admin/                  # Gestion membres, stats, retraits
├── gateway/                    # API Gateway port 4000
└── frontend/                   # Next.js 14 (FR/EN/AR)
    └── src/
        ├── app/
        │   ├── page.tsx         # Landing page
        │   ├── auth/login/      # Connexion
        │   ├── auth/register/   # Inscription 2 étapes
        │   ├── dashboard/       # Dashboard affilié
        │   └── admin-panel/     # Panel admin
        ├── components/
        │   └── Navbar.tsx       # Navigation multilingue
        ├── contexts/
        │   └── AuthContext.tsx  # Session & langue
        └── lib/
            ├── api.ts           # Axios client
            └── translations.ts  # FR / EN / AR
```

## API Endpoints

### Auth (`/api/auth`)
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Créer un compte |
| POST | `/auth/login` | Se connecter |
| POST | `/auth/refresh` | Rafraîchir le token |
| GET | `/auth/me` | Profil utilisateur |
| POST | `/auth/logout` | Se déconnecter |

### Affiliate (`/api/affiliate` — JWT requis)
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/affiliate/dashboard` | Dashboard complet |
| GET | `/affiliate/referrals?depth=3` | Arbre de parrainage |
| GET | `/affiliate/earnings` | Historique des gains |
| GET | `/affiliate/earnings/summary` | Résumé par type |
| GET | `/affiliate/notifications` | Notifications |
| PATCH | `/affiliate/notifications/read` | Marquer lus |
| PATCH | `/affiliate/profile` | Modifier profil |
| POST | `/affiliate/withdraw` | Demande de retrait |

### Admin (`/api/admin` — Admin JWT requis)
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | Statistiques globales |
| GET | `/admin/users` | Liste des membres |
| GET | `/admin/users/:id` | Détail membre |
| PATCH | `/admin/users/:id/status` | Suspendre/Activer |
| PATCH | `/admin/users/:id/rank` | Changer le rang |
| POST | `/admin/users/:id/credit` | Crédit manuel |
| GET | `/admin/withdrawals` | Liste des retraits |
| PATCH | `/admin/withdrawals/:id` | Gérer un retrait |
| POST | `/admin/notify` | Envoyer notification |

## Plan de compensation supporté

1. Retail Bonus (+20% marge)
2. Direct Sponsorship
3. Upgrade Bonus
4. Matching Bonus
5. Personal Purchase (15%)
6. SS1-Cycle Bonus (PCB)
7. SEAT KIT ($0.30–$6.15)
8. SEAT Product ($0.15–$0.45)
9. SEAT Stockist ($11.5)
10. SEAT Cosmetic ($0.11–$0.45)
11. Pool Bonus (3% profits mensuels, KING requis)
12. Awards (Voyages, Voitures, Cash)
13. Hall of Fame
14. Cosmetic SS1
15. Ambassador Stockist

## Variables d'environnement

Copier `.env.example` → `.env` et renseigner :

```env
JWT_SECRET=your_very_long_secret_here
DATABASE_URL=postgresql://ss1_user:ss1_secret_2024@postgres:5432/ss1_db
REDIS_URL=redis://redis:6379
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Développement sans Docker

```bash
# Auth service
cd services/auth && npm install && npm start

# Affiliate service
cd services/affiliate && npm install && npm start

# Admin service
cd services/admin && npm install && npm start

# Gateway
cd gateway && npm install && npm start

# Frontend
cd frontend && npm install && npm run dev
```

---
© 2024 ss1 — `ss1.local`
