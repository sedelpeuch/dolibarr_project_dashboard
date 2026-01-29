# Checkpoint - Balthazar v1.0

## Date: 29 janvier 2026

### ✅ Fonctionnalités Complétées

#### Dashboard Principal
- [x] Affichage de tous les projets avec pagination/filtrage
- [x] Séparation Projets / Opportunités / RD
- [x] Statut de chaque projet (Ouvert/Cloturé)
- [x] Affichage du nom du client
- [x] Badges unitechs (SIDO, SONU, HOMA)
- [x] Titre clickable vers Dolibarr avec hover effect

#### Métriques Projet
- [x] Temps passé total (via tasks avec includetimespent=2)
- [x] Jours planifiés (wp_days + rd_days)
- [x] Montants facturés vs budget
- [x] Dates début/fin (cachées pour RD)
- [x] Affichage avec séparateurs de milliers (39 500 €)

#### Indicateurs de Données Manquantes
- [x] "Aucun jour" en rouge si aucune donnée de jours (sauf pour opportunités)
- [x] "Pas de deadline" en rouge si date_end = 0 (sauf pour opportunités)
- [x] "Pas de budget" en rouge si montant = 0 (sauf pour opportunités)
- [x] Les opportunités ne montrent pas ces avertissements (comportement normal)
- [x] Les RD n'affichent pas budget/dates/client

#### Gestion des Projets Configurés
- [x] Modal "Gestion des projets" pour ajouter/retirer projets
- [x] Recherche de projets dans Dolibarr par ID (`/api/search-project/{id}`)
- [x] Affichage ref en gros, title en petit, ID avant le title
- [x] Badge Ouvert/Cloturé pour chaque projet
- [x] Tri: ouverts en premier, clôturés en dernier
- [x] Bouton "Chercher" (pas d'auto-déclenchement)
- [x] Suppression de projets de la liste

#### Backend
- [x] Endpoint GET `/api/dashboard` - Tous les projets avec métriques
- [x] Endpoint GET `/api/projects/{id}` - Détails projet
- [x] Endpoint GET `/api/projects/{id}/tasks` - Tasks avec timespent
- [x] Endpoint GET `/api/invoices` - Factures filtrées
- [x] Endpoint GET `/api/projects-config` - Projets configurés avec statut
- [x] Endpoint POST `/api/projects-config` - Sauvegarde liste de projets
- [x] Endpoint GET `/api/search-project/{id}` - Cherche projet dans Dolibarr
- [x] Intégration DolibarrClient pour fetch projets/tasks/invoices
- [x] Logs httpx désactivés (WARNING level)

#### Frontend
- [x] App.tsx - Header avec Balthazar (sans sous-titre), bouton Gérer
- [x] ProjectCard - Affichage moderne avec toutes les infos
- [x] ProjectsConfigModal - Gestion complète des projets
- [x] Utilisation de axios avec api.ts (baseURL correctement configurée)
- [x] Fonction formatAmount() pour montants avec séparateurs

#### UI/UX
- [x] Titre "Balthazar" (pas "Dashboard Dolibarr")
- [x] Pas de "Coordinateur de projets" en sous-titre
- [x] Gradient header bleu/slate
- [x] Modal bien intégrée (backdrop, styling, animations)
- [x] Responsive design avec Tailwind

### 📊 État Actuel

**Projets Configurés**: 24 projets actifs
- IDs: 1050, 1074, 1082, 1084, 1085, 1092, 1118, 1119, 266, 304, 642, 718, 835, 854, 899, 900, 902, 927, 951, 962, 963, 964, 973, 975

**API Endpoints Actifs**:
```
GET  /api/dashboard              → Tous les projets avec métriques
GET  /api/projects/{id}          → Détails d'un projet
GET  /api/projects/{id}/tasks    → Tasks du projet
GET  /api/invoices?sqlfilters... → Factures du projet
GET  /api/projects-config        → Liste projets configurés
POST /api/projects-config        → Sauvegarde liste projets
GET  /api/search-project/{id}    → Cherche projet Dolibarr
```

**Frontend Routes**:
```
/                                 → Dashboard avec filtres (Projects/Opportunities/RD)
```

### 🔄 Flux Utilisateur

1. **Accueil**: Voir tous les projets du dashboard
2. **Filters**: Tabs pour Projects/Opportunities/RD
3. **Project Details**: Clic sur titre → Dolibarr
4. **Manage Projects**: Bouton "Gérer" → Modal
   - Voir liste des projets (tri: ouvert/fermé)
   - Chercher nouveau projet par ID
   - Ajouter/Supprimer projets

### 🚀 Technologies

- **Backend**: FastAPI, httpx, Pydantic, Python 3.11+
- **Frontend**: React 18.2+, TypeScript, Vite, Tailwind CSS, lucide-react, axios
- **API Externe**: Dolibarr (gaaspard.catie.fr)
- **Data**: projects.json (whitelist)

### 📝 Notes Techniques

- Path projects.json: `/home/sedelpeuch/PERSO-SDE/balthazar/backend/projects.json`
- Backend port: 41587
- Frontend dev port: 5173
- API baseURL: `http://localhost:41587/api`
- Statut projet: 2 = Cloturé, autres = Ouvert

### ⏭️ Prochaines Étapes Possibles

- [ ] Détail page pour chaque projet (tasks, invoices détaillés)
- [ ] Planification vs Actuel (comparaison jours)
- [ ] Export/Rapport des projets
- [ ] Historique des modifications
- [ ] Alertes pour data manquantes
- [ ] Recherche/Filtres avancés
- [ ] Dark/Light mode toggle

---

**Status**: ✅ Stable - Prêt pour utilisation
  - Loading and error states

- **hooks/useDashboard.ts**: Data fetching hook
  - Handles loading state
  - Error handling with retry capability
  - useEffect to fetch on component mount

- **components/ProjectsList.tsx**: Grid layout
  - Maps projects to cards
  - Shows "No projects found" message if empty

- **components/ProjectCard.tsx**: Individual project card
  - Displays all project information
  - Responsive layout with Tailwind CSS
  - Links to Dolibarr external resources

- **components/ErrorMessage.tsx**: Error UI
- **components/LoadingSpinner.tsx**: Loading UI

### File Structure (Final)

```
backend/
├── src/dolibarr_dashboard/
│   ├── __init__.py
│   ├── config.py           # Configuration + tracked projects loading
│   ├── dolibarr_client.py  # Single method: get_project_by_id()
│   └── main.py             # Single endpoint: /api/dashboard
├── projects.json           # Whitelist of project IDs to track
└── pyproject.toml

frontend/
├── src/
│   ├── App.tsx             # Main app (no modals, simple state)
│   ├── api.ts              # Simple interfaces + getDashboard()
│   ├── config.ts           # Constants
│   ├── main.tsx            # Entry point
│   ├── index.css           # Tailwind styles
│   ├── components/
│   │   ├── ProjectsList.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── ErrorMessage.tsx
│   │   └── LoadingSpinner.tsx
│   └── hooks/
│       └── useDashboard.ts
└── package.json
```

### What Was Removed (Cleanup)

✅ **Deleted Components**
- `ProjectDetailModal.tsx` - Modal view not needed for list feature
- `OpportunitiesList.tsx` - Opportunities not part of feature
- `Layout.tsx` - Unused layout wrapper

✅ **Removed Methods** (DolibarrClient)
- `get_projects()` - Full list not used
- `get_project_detail()` - Duplicate of get_project_by_id
- `get_proposals()` - For future phases
- `get_invoices()` - For future phases
- `get_timesheets()` - For future phases
- `get_project_contacts()` - For future phases
- `get_project_roles()` - For future phases
- `get_proposal_detail()` - For future phases
- `get_invoice_detail()` - For future phases
- `get_contact()` - For future phases
- `get_user()` - For future phases

✅ **Removed Endpoints** (Backend)
- `/api/project/{id}/full` - Detail endpoint not implemented

✅ **Removed Interfaces** (Frontend)
- `Proposal` interface
- `Invoice` interface
- `ProjectDetail` interface
- `getProjectFull()` API method

✅ **Fixed Issues**
- Removed timesheet calculations and display
- Fixed type conversion for budget values (strings to floats)
- Fixed React ref warning by renaming `ref` prop to `projectRef`
- Fixed API endpoint path (removed duplicate `/api`)

### Configuration

**Environment Variables** (`.env` at root)
```bash
# Dolibarr
DOLIBARR_URL=https://gaaspard.catie.fr
DOLIAPIKEY=Mq39zOdZr4aHG5tIgS2N

# Backend
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=41587
FASTAPI_ENV=development

# Frontend (Vite)
VITE_API_URL=http://0.0.0.0:41587/api
VITE_DOLIBARR_URL=https://gaaspard.catie.fr
```

**Tracked Projects** (`projects.json`)
```json
{
  "projects": [1092],
  "description": "Liste des projets à suivre dans le dashboard"
}
```

### API Endpoint

**GET `/api/dashboard`**

Response:
```json
{
  "projects": [
    {
      "id": 1092,
      "ref": "PROJECT_REF",
      "title": "Project Title",
      "client_name": "123",
      "status": 1,
      "deadline": "2025-12-31T00:00:00",
      "budget_total": 50000.0,
      "total_invoiced": 0.0,
      "budget_remaining": 50000.0
    }
  ]
}
```

### Code Quality

✅ **Professional Standards**
- Type-safe TypeScript throughout
- Proper error handling and logging
- Clean separation of concerns
- No hardcoded values (environment variables)
- Responsive design with Tailwind CSS
- Dark theme for professional appearance
- Proper component hierarchy
- No unused imports or dead code

✅ **Performance**
- Single API call per project (no N+1 queries)
- Efficient grid layout with CSS
- Minimal re-renders with React best practices
- No unnecessary state management

### Testing Status

✅ **Backend** - Tested and working
- Returns project data correctly
- Handles missing projects gracefully
- Budget calculations accurate
- Type conversion working

✅ **Frontend** - Tested and working
- Renders without errors
- API integration working
- Error states display correctly
- Refresh button functional
- Responsive layout verified

### Next Steps (When Ready)

1. **Add More Projects** - Update `projects.json` with additional IDs
2. **Add Proposals Phase** - Fetch and display proposals (devis)
3. **Add Invoices Phase** - Fetch and display invoices
4. **Project Details** - Modal/page with full details
5. **UI for Project Management** - Add/remove projects from dashboard

---

**Date**: January 29, 2026
**Feature Set**: Minimal, Clean, Working
**Code Status**: Production-Ready ✅
