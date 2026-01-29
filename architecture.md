# Architecture - Dashboard Dolibarr Coordinateur

## 🎯 Besoins spécifiques

**Utilisateur**: Coordinateur de projet
**Contexte**: Voir rapidement l'état global de ses projets et opportunités

### Données nécessaires

#### 1. **PROJETS** (ce que je coordonne)

Pour chaque projet, afficher en un coup d'oeil:

- **Informations projet**:
  - Nom du projet
  - Client
  - Statut (en cours / suspendu / complété)
  - Deadline
  - Budget total (montant)

- **Données liées au projet**:
  - **Temps passé**: Heures consommées (total, ou par ressource?)
  - **Devis/Propositions**: Associées au projet (statut, montant)
  - **Factures**: Facturées pour ce projet (statut paiement, montant)
  - **Budget restant**: Budget - heures passées (calculé front/back?)

#### 2. **OPPORTUNITÉS** (ce que je coordonne)

Pour chaque opportunité:

- Nom / Client
- Montant / Valeur
- Probabilité / Statut (lead / proposition envoyée / à qualifier)
- Prochaine action (date de suivi)

---

## 🏗️ Architecture technique

```
┌─────────────────────────────────────────────┐
│         React Frontend (SPA)                 │
│                                              │
│  - Page d'accueil                           │
│  - Liste des projets (je coordonne)         │
│  - Détail projet (modal/page)               │
│  - Liste des opportunités                   │
│                                              │
│  Hook: useFetchDashboard()                  │
│  → GET /api/dashboard                       │
└──────────────┬────────────────────────────┘
               │
               │ HTTP GET
               ▼
┌──────────────────────────────────────────────┐
│        FastAPI Backend                        │
│                                               │
│  Route 1: GET /api/dashboard                 │
│  ├─ Appelle Dolibarr /projects               │
│  ├─ Appelle Dolibarr /opportunities          │
│  └─ Retourne JSON agrégé                     │
│                                               │
│  Route 2: GET /api/project/{id}              │
│  ├─ Détails projet                           │
│  ├─ Timesheets liés                          │
│  ├─ Proposals liés                           │
│  ├─ Invoices liés                            │
│  └─ Retourne JSON complet                    │
│                                               │
│  dolibarr_client.py:                         │
│  ├─ get_projects()                           │
│  ├─ get_project_details(id)                  │
│  ├─ get_timesheets_by_project(id)            │
│  ├─ get_proposals_by_project(id)             │
│  ├─ get_invoices_by_project(id)              │
│  ├─ get_opportunities()                      │
│  └─ _request(endpoint, params)               │
└──────────────┬────────────────────────────┘
               │
               │ HTTP GET + DOLIAPIKEY
               ▼
┌──────────────────────────────────────────────┐
│       Dolibarr REST API                       │
│                                               │
│  - /projects (filtrer par coordinateur)      │
│  - /projects/{id}                            │
│  - /timesheets (filtrer par projet)          │
│  - /proposals (filtrer par projet)           │
│  - /invoices (filtrer par projet)            │
│  - /opportunities (filtrer par user)         │
└──────────────────────────────────────────────┘
```

---

## 📡 Endpoints FastAPI

### `GET /api/dashboard`

**Retour**: Liste agrégée de tout ce qui est visible à l'accueil

```json
{
  "projects": [
    {
      "id": 1,
      "ref": "PROJ-001",
      "title": "Nom du projet",
      "client_name": "Client XYZ",
      "status": "in_progress",
      "deadline": "2026-03-15",
      "budget_total": 50000,
      "total_timesheets_hours": 120,
      "total_invoiced": 35000,
      "budget_remaining": 15000
    }
  ],
  "opportunities": [
    {
      "id": 1,
      "ref": "OPP-001",
      "title": "Nouvelle opportunité",
      "company_name": "Client ABC",
      "amount": 100000,
      "probability": 30,
      "status": "qualifie",
      "next_action_date": "2026-02-05"
    }
  ]
}
```

### `GET /api/project/{id}/full`

**Retour**: Détails complets d'un projet

```json
{
  "project": { /* données projet */ },
  "timesheets": [
    {
      "id": 1,
      "employee": "Jean Dupont",
      "hours": 40,
      "date": "2026-01-20",
      "task_description": "Développement backend"
    }
  ],
  "proposals": [
    {
      "id": 1,
      "ref": "PROP-001",
      "amount": 25000,
      "status": "draft"
    }
  ],
  "invoices": [
    {
      "id": 1,
      "ref": "INV-001",
      "amount": 25000,
      "status": "paid",
      "date": "2026-01-10"
    }
  ]
}
```

---

## 🎨 Composants React

```
App.tsx
├── Layout.tsx (header, sidebar)
│
├── Pages/
│   ├── Dashboard.tsx (accueil)
│   │   ├── ProjectsList.tsx
│   │   │   └── ProjectCard.tsx (clickable → détail)
│   │   └── OpportunitiesList.tsx
│   │       └── OpportunityCard.tsx
│   │
│   └── ProjectDetail.tsx (modal ou page)
│       ├── ProjectHeader.tsx
│       ├── TimesheetsList.tsx
│       ├── ProposalsList.tsx
│       └── InvoicesList.tsx
│
└── Hooks/
    └── useDashboard.ts (fetch + état)
```

### Interactions clés

- **Page d'accueil**: Chargement → `GET /api/dashboard` → Affichage listes
- **Clic sur projet**: Popup/page détail → `GET /api/project/{id}/full`
- **Clic sur opportunité**: Affichage détails (ou redirection Dolibarr)

---

## 🔑 Configuration

### Backend (.env)

```
DOLIBARR_URL=https://votre-dolibarr.com
DOLIAPIKEY=your_api_key_here
FASTAPI_PORT=8000
```

### Frontend (.env)

```
VITE_API_URL=http://localhost:8000/api
```

---

## 📂 Structure projet

```
dolibarr-dashboard/
│
├── backend/
│   ├── main.py              # App FastAPI
│   ├── dolibarr_client.py   # Client API Dolibarr
│   ├── pyproject.toml       # uv config
│   ├── requirements.txt      # dépendances
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   └── ProjectDetail.tsx
│   │   ├── components/
│   │   │   ├── ProjectsList.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── OpportunitiesList.tsx
│   │   │   └── OpportunityCard.tsx
│   │   ├── hooks/
│   │   │   └── useDashboard.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
│
├── docker-compose.yml       # Plus tard
└── architecture.md          # Ce fichier
```

---

## 🎨 Interface & Pages

### 📱 Layout Global
```
┌─────────────────────────────────────────────────┐
│  🔗 Logo | Dashboard     [Refresh] [Settings]   │  ← Header
├─────────────────────────────────────────────────┤
│                                                  │
│  Main Content (voir ci-dessous selon page)      │
│                                                  │
└─────────────────────────────────────────────────┘
```

Thème: **Dark mode** (fond sombre, texte clair, accents bleus/verts)

---

### 1️⃣ **PAGE D'ACCUEIL - Dashboard Principal**

**Section 1: Projets (en haut, prioritaire)**

```
┌─────────────────────────────────────────────────────────┐
│ MES PROJETS                                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ 🔗 Proj 1        │  │ 🔗 Proj 2        │            │
│  │ Client: ACME     │  │ Client: Beta Inc │            │
│  │ Deadline: 15/03  │  │ Deadline: 28/02  │            │
│  ├──────────────────┤  ├──────────────────┤            │
│  │ Budget: €50k     │  │ Budget: €75k     │            │
│  │ Temps: 120h      │  │ Temps: 220h      │            │
│  │ Facturé: €35k    │  │ Facturé: €50k    │            │
│  │ Restant: €15k    │  │ Restant: €25k    │            │
│  │                  │  │                  │            │
│  │ [Voir détails]   │  │ [Voir détails]   │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
│  [Card cliquable pour ouvrir détails]                  │
└─────────────────────────────────────────────────────────┘
```

**Chaque card affiche:**
- Nom du projet (lien cliquable)
- Client (lien cliquable)
- Deadline (avec indicateur couleur: vert si >7j, orange si 3-7j, rouge si <3j)
- Budget total / Facturé / Restant
- Temps total
- Bouton "Voir détails"

---

### 2️⃣ **PAGE DÉTAILS PROJET** (Modal ou page)

```
┌──────────────────────────────────────────────────────────────┐
│ ✕ DÉTAILS - 🔗 Projet 1                                      │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ 📌 HEADER PROJECT                                             │
│ ├─ Nom: 🔗 Proj 1                                            │
│ ├─ Client: 🔗 ACME Corp                                      │
│ ├─ Statut: ✅ In Progress                                    │
│ ├─ Deadline: 15/03/2026                                       │
│ └─ 📝 Notes: [icône] Voir notes...                           │
│                                                                │
│ 📊 FINANCIER                                                  │
│ ├─ Budget total: €50,000                                     │
│ ├─ Facturé: €35,000                                          │
│ ├─ Restant: €15,000                                          │
│ └─ Progression: ████████░░ 70%                               │
│                                                                │
│ ⏱️ TEMPS CONSOMMÉ                                            │
│ ├─ Total: 120 heures                                         │
│ └─ Par personne:                                             │
│    • 🔗 Jean Dupont: 45h                                     │
│    • 🔗 Marie Martin: 40h                                    │
│    • 🔗 Pierre Durand: 35h                                   │
│                                                                │
│ 📄 PROPOSITIONS COMMERCIALES                                 │
│ ├─ 🔗 PROP-001 | €25,000 | Draft                            │
│ │  📝 Notes: [icône]                                         │
│ └─ 🔗 PROP-002 | €25,000 | Accepted                         │
│    📝 Notes: [icône]                                         │
│                                                                │
│ 💰 FACTURES                                                   │
│ ├─ 🔗 INV-001 | €25,000 | Paid (10/01/2026)                 │
│ │  📝 Notes: [icône]                                         │
│ └─ 🔗 INV-002 | €10,000 | Draft (25/01/2026)                │
│    📝 Notes: [icône]                                         │
│                                                                │
│ [Lien vers Dolibarr] [Fermer]                                │
└──────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Clic sur projet/client/personne → ouvre Dolibarr dans nouvel onglet
- Clic sur icône notes → affiche les notes en popup/tooltip
- Clic sur proposal/facture → ouvre Dolibarr dans nouvel onglet

---

### 3️⃣ **SECTION OPPORTUNITÉS** (bas du dashboard)

```
┌──────────────────────────────────────────────────────────┐
│ MES OPPORTUNITÉS                                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Opp 1: 🔗 Nouvelle appli web          │ Probabilité: 30% │
│  Client: 🔗 TechStart                  │ €100,000         │
│  Statut: Qualifiée                     │ Suivi: 05/02     │
│  📝 Notes: [icône]                     │ [Voir]           │
│  ─────────────────────────────────────────────────────────│
│                                                           │
│  Opp 2: 🔗 Migration cloud             │ Probabilité: 60% │
│  Client: 🔗 BigCorp Inc                │ €250,000         │
│  Statut: Proposition envoyée           │ Suivi: 15/02     │
│  📝 Notes: [icône]                     │ [Voir]           │
│                                                           │
│  [Total opportunités: €350,000 | Valeur pondérée: €166k] │
└──────────────────────────────────────────────────────────┘
```

**Chaque opportunité:**
- Nom (lien cliquable)
- Client (lien cliquable)
- Montant / Probabilité
- Statut
- Prochaine action
- Notes (icône)

---

### 4️⃣ **MODAL OPPORTUNITÉ DÉTAIL** (optionnel)

```
┌──────────────────────────────────────────────────────────┐
│ ✕ OPPORTUNITÉ - 🔗 Nouvelle appli web                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Client: 🔗 TechStart                                    │
│ Montant: €100,000                                        │
│ Probabilité: 30%                                         │
│ Statut: Qualifiée                                        │
│ Prochaine action: 05/02/2026                             │
│ 📝 Notes: [Section repliable]                            │
│ [Lien vers Dolibarr]                                     │
│                                                           │
│ [Fermer]                                                 │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 Hiérarchie visuelle (importance)

1. **Projets** (prioritaire, en haut)
   - Cards grandes avec infos clés
   - Cliquables pour détails

2. **Opportunités** (secondaire, en bas)
   - Liste simple/cards
   - Infos essentielles

3. **Notes** (optionnel, icône discret)
   - Visible mais pas intrusive
   - Déroulable sur demande

---

## 🖌️ Couleurs & Styling (Dark Mode)

```
Fond: #0f0f0f (noir très sombre)
Texte principal: #e5e5e5 (gris clair)
Texte secondaire: #a0a0a0 (gris moyen)
Accents: #3b82f6 (bleu) / #10b981 (vert)

Cards: #1a1a1a (gris très sombre)
Border: #333333 (gris foncé)

Statuts:
  ✅ Vert (#10b981): En cours, Paid, Accepted
  ⚠️ Orange (#f59e0b): Proche deadline, Draft
  ❌ Rouge (#ef4444): Overdue, Impayé
```

---

## 📋 Spécifications finalisées

### Filtre utilisateur

- **User ID**: 42 (utilisateur courant)
- **Critère**: Un projet est visible si user 42 est **coordinateur** dans les contacts du projet

### Timesheets

- Afficher **temps total** pour le projet
- Afficher **temps par personne** (list avec employé + heures)

### Navigation & Liens

- Tous les éléments principaux sont **cliquables/liens** vers Dolibarr:
  - Nom du projet → Dolibarr projet
  - Client → Dolibarr client
  - Numéro proposal/facture → Dolibarr resource
  - Employé → Dolibarr contact
- Format des liens: `${DOLIBARR_URL}/module/path?id=xxx`

### Notes

- Afficher les notes/commentaires sur:
  - Projets (notes du projet)
  - Propositions (notes proposal)
  - Factures (notes invoice)
- Affichage: Petit icône ou section repliable

### Design

- **Framework**: Tailwind CSS + Shadcn UI (moderne, sombre, composants riches)
- **Thème**: Dark mode par défaut
- **Refresh**: Manuel seulement (bouton Refresh ou F5)

---

## ✅ Ready to code

Spec finalisée, pas d'autres questions. On peut commencer! 🚀
