# Dolibarr Dashboard

Dashboard pour coordinateurs de projets utilisant Dolibarr.

## Installation

### API

```bash
cd api
uv sync
```

### Web

```bash
cd web
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

### API

```bash
cd api
uv run python main.py
```

L'API sera disponible sur `http://localhost:8000`

### Web

```bash
cd web
yarn dev
```

L'interface sera disponible sur `http://localhost:5173`

## Architecture

- **API**: FastAPI + Python (client Dolibarr)
- **Web**: React + TypeScript + Tailwind CSS
- **Style**: Dark mode moderne

## Endpoints API

- `GET /api/dashboard` - Données agrégées (projets + opportunités)
- `GET /api/project/{id}/full` - Détails complets d'un projet
