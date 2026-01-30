# 🚀 Dolibarr Project Dashboard

> **⚠️ EXPERIMENTAL**: Ce projet est encore en développement actif. L'architecture et les features peuvent changer rapidement. Ne pas utiliser en production sans audit de sécurité approfondi. Le projet est développé pour un usage personnel et permet aussi de tester le développement avec des agents IA.

---

## 👀 Vue d'ensemble

Un **dashboard pour coordinateurs de projets** qui agrège les données de votre instance [Dolibarr](https://dolibarr.org/) en une interface moderne et intuitive.

**Cas d'usage principal** :

- Coordinateur de projets qui doit suivre **plusieurs projets simultanément**
- Besoin d'une vue consolidée des tâches, factures, propositions commerciales
- Temps passé par équipe sur chaque projet
- Clients/tiers associés et statuts

**Problème résolu** :
Dolibarr est puissant mais son interface n'est pas optimisée pour avoir une vue d'ensemble rapide de plusieurs projets. Ce dashboard agrège ces données et les présente de manière lisible et navigable.

---

## ✨ Fonctionnalités

### 🔍 Dashboard principal

- **Vue globale** de tous les projets tracés
- **Agrégation des données** : tâches, temps passé, factures, propositions
- **Liens directs** vers Dolibarr pour chaque ressource

### 🏢 Gestion des projets

- **Sélectionner** les projets à tracker
- **Configuration dynamique** sans redémarrage
- **Données persistées** dans `data.json` (pas de localStorage)

### 📊 Données agrégées par projet

- **Tâches** : liste avec statut
- **Temps passé** : par utilisateur
- **Factures** : montants, statuts
- **Propositions commerciales** : détails et lignes
- **Client** : nom et lien vers Dolibarr

---

## 🏗️ Architecture

### Pattern : Layered (3 couches)

```
┌─────────────────────────────────────┐
│  HTTP Layer (routes/)               │
│  - Thin endpoints                   │
│  - Request/response handling        │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│  Business Logic Layer (services/)   │
│  - Dashboard aggregation            │
│  - Data transformation              │
│  - Caching logic                    │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│  Infrastructure Layer                │
│  (infrastructure/)                   │
│  - Dolibarr API client              │
│  - Data storage (JSON)              │
│  - Logging & caching                │
└─────────────────────────────────────┘
```

### Avantages de cette architecture

✅ **Testable** - Services faciles à mocker  
✅ **Scalable** - Ajouter des features sans casser l'existant  
✅ **Maintenable** - Chaque couche a une responsabilité unique  
✅ **Réutilisable** - Services utilisables par plusieurs routes  

---

## 🛠️ Stack technique

### Backend

- **Framework** : FastAPI (Python 3.11+)
- **Client API** : httpx (async HTTP)
- **Storage** : JSON file-based (data/data.json)
- **Logging** : Python logging + JSON formatter
- **Caching** : Thread-safe generic cache (RLock)
- **Config** : Pydantic Settings (env vars)

### Frontend

- **Framework** : React 18.2+
- **Language** : TypeScript
- **Build** : Vite
- **Styling** : Tailwind CSS
- **HTTP** : Axios
- **State** : React hooks

### Infrastructure

- **Containerization** : Docker & Docker Compose
- **Dev tools** : uv (Python), yarn (Node)
- **Code quality** : ruff (linting), pre-commit hooks

---

## 📦 Installation

### Prérequis

- Python 3.11+
- Node.js 18+ (ou use nvm)
- Docker & Docker Compose (optionnel, pour production)
- Compte Dolibarr avec API key

### 1️⃣ Cloner le repo

```bash
git clone https://github.com/sedelpeuch/dolibarr_project_dashboard.git
cd dolibarr_project_dashboard
```

### 2️⃣ Configuration

```bash
cp .env.example .env
```

Éditer `.env` avec vos infos :

```bash
export DOLIBARR_URL=https://your-dolibarr.com
export DOLIAPIKEY=your_api_key_here
export CURRENT_USER_ID=42
export APP_NAME=Dolibarr Dashboard
export DATA_DIR=/home/user/dolibarr-dashboard/data
```

### 3️⃣ Installation des dépendances

**API (Python)**

```bash
cd api
source ../.env  # Charger les variables d'env
uv sync
```

**Web (Node)**

```bash
cd web
source ../.env
yarn install
```

### 4️⃣ Lancer en développement

**Terminal 1 - API**

```bash
cd api
source ../.env
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 41587
```

API disponible : `http://localhost:41587`  
Docs : `http://localhost:41587/docs`

**Terminal 2 - Web**

```bash
cd web
source ../.env
yarn dev
```

Frontend disponible : `http://localhost:5173`

### 5️⃣ (Optionnel) Lancer avec Docker

```bash
source .env
docker compose up --build
```

- API : `http://localhost:41587`
- Web : `http://localhost:5173`

---

## ⚙️ Configuration

### Variables d'environnement

| Variable | Description | Exemple | Requis |
|----------|-------------|---------|--------|
| `DOLIBARR_URL` | URL de votre instance Dolibarr | `https://dolibarr.mycompany.com` | ✅ |
| `DOLIAPIKEY` | Clé API Dolibarr | `...` | ✅ |
| `CURRENT_USER_ID` | ID utilisateur pour les appels API | `42` | ❌ (défaut: 42) |
| `APP_NAME` | Nom affiché dans l'header | `Dolibarr Dashboard` | ❌ |
| `DATA_DIR` | Répertoire pour data.json | `./data` | ❌ |
| `FASTAPI_HOST` | Host API | `0.0.0.0` | ❌ |
| `FASTAPI_PORT` | Port API | `41587` | ❌ |
| `FASTAPI_ENV` | `development` ou `production` | `development` | ❌ |

### Initialisation des données

Au démarrage, l'API crée automatiquement `data/data.json` avec cette structure :

```json
{
  "meta_projects": [],
  "projects": []
}
```

- **meta_projects** : Métadonnées sur les projets (futur)
- **projects** : Liste des IDs de projets à tracker

---

### Flux de données

```
Frontend                    Backend
   │                          │
   ├─ GET /api/config ────────► Load DOLIBARR_URL
   │                          │
   ├─ GET /api/dashboard ────► DashboardService
   │                          │   ├─ load_data() from data.json
   │                          │   ├─ Loop projects
   │                          │   ├─ fetch Dolibarr API
   │                          │   └─ aggregate data
   │◄─ JSON response ─────────┤
   │                          │
   ├─ POST /api/projects-config ──► save_data(data.json)
   │◄─ Updated config ────────┤
```

### Services expliqués

#### DashboardService

**Responsabilité** : Agréger les données de plusieurs projets

**Méthodes principales** :

- `get_dashboard_data()` : Point d'entrée
- `_build_project_data(id)` : Construire un projet
- `_get_thirdparty_name(id)` : Fetch client (avec cache)
- `_get_tasks_data(id)` : Extraire les tâches
- `_get_invoices_data(id)` : Extraire les factures
- `_get_proposals_data(id)` : Extraire les propositions commerciales

**Avantages** :

- Logique isolée et testable
- Cache thread-safe pour clients
- Logging structuré avec contexte
- Decomposed en méthodes réutilisables

### Infrastructure layer

#### ThreadSafeCache[T]

Generic cache avec locks RLock pour accès concurrent.

```python
cache = ThreadSafeCache()
cache.set("key", "value")
cache.get("key")  # "value"
cache.get_or_set("key", lambda: compute())  # Lazy computation
```

#### Structured Logging

Logs en JSON pour parsing facile en production.

```python
logger.warning("Message", extra={"context": {"project_id": 123}})
# Output: {"timestamp": "...", "level": "WARNING", "logger": "...", "message": "Message", "context": {"project_id": 123}}
```

#### Data Storage

Centralisé dans `data/data.json`, rechargé à chaque requête (pas de cache stale).

```python
data = load_data()  # dict with "projects", "meta_projects"
save_data(data)     # Atomic write
```

#### Dolibarr Client

Wrapper httpx pour l'API REST Dolibarr.

```python
client = DolibarrClient(url, api_key)
project = client.get_project_by_id(123)
tasks = client.get_project_tasks(123)
invoices = client.get_project_invoices(123)
```

---

## 🚀 Déploiement

### Docker (Production)

```bash
docker compose -f docker-compose.yml up --build -d
```

Services lancés :

- **API** : Port 41587
- **Web** : Port 5173

### Configuration Docker

Voir `docker-compose.yml` pour les volumes et variables d'env.
