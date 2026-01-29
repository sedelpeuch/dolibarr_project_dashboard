# Dolibarr Dashboard

Dashboard pour coordinateurs de projets utilisant Dolibarr.

## Installation

### Backend

```bash
cd backend
uv sync
```

### Frontend

```bash
cd frontend
yarn install
```

## Configuration

Copier `.env.example` à `.env` et remplir les variables:

```bash
cp .env .env
```

Éditer `.env` avec vos données:
- `DOLIBARR_URL`: URL de votre instance Dolibarr
- `DOLIAPIKEY`: Clé API Dolibarr
- `CURRENT_USER_ID`: ID de l'utilisateur (coordinateur)

## Développement

### Backend

```bash
cd backend
uv run python main.py
```

L'API sera disponible sur `http://localhost:8000`

### Frontend

```bash
cd frontend
yarn dev
```

L'interface sera disponible sur `http://localhost:5173`

## Architecture

- **Backend**: FastAPI + Python (client Dolibarr)
- **Frontend**: React + TypeScript + Tailwind CSS
- **Style**: Dark mode moderne

## Endpoints API

- `GET /api/dashboard` - Données agrégées (projets + opportunités)
- `GET /api/project/{id}/full` - Détails complets d'un projet
