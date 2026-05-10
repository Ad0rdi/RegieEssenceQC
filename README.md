# Regie Essence Quebec - Prix d'Essence en Temps Reel

[![Vite](https://img.shields.io/badge/built%20with-Vite-blue)](https://vite.dev)
[![React](https://img.shields.io/badge/framework-React%2019-purple)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Visualisation interactive des prix de l'essence (Regulier, Super, Diesel) dans toutes les stations d'essence du Quebec en temps reel.

## Apercu

Application web qui affiche sur une carte interactive les prix des carburants de toutes les stations d'esserie au Quebec. Les donnees sont issues du site officiel de la Regie de l'energie.

### Lien vers l'application

**URL de deploiement :** https://Ad0rdi.github.io/RegieEssenceQC/

## Fonctionnalites

- **Carte interactive** - Visualisation des stations d'essence avec des marqueurs en forme de camembert, codes par couleur selon le niveau de prix (vert = bas, orange = moyen, rouge = eleve).
- **Regroupement de marqueurs** - Les stations sont regroupees automatiquement lors du zoom arriere pour une meilleur lisibilite.
- **Recherche par ville** - Recherche de villes du Quebec (280 villes integrees avec appariement flou) et recherche precise d'adresse via l'API Nominatim.
- **Filtre de carburant** - Filtrer par type de carburant (Regulier, Super, Diesel) avec des boutons pill.
- **Filtre de prix et de distance** - Filtrer les stations par gamme de prix et rayon (en km) a partir d'un point de reference.
- **Geolocalisation** - Bouton "Ma position" pour afficher votre position GPS et filtrer les stations a proximite.
- **Liste des stations** - Panneau coulissant avec tableau triable montrant la marque, l'adresse, la distance et les prix.
- **Mode sombre** - Basculer entre les themes clair et sombre.
- **Responsive** - Interface adaptee mobile et desktop.

## Technologies

| Cote | Technologie |
|---|---|
| **Framework** | React 19 + Vite 8 |
| **Cartographie** | Leaflet 1.9 + react-leaflet 5 + Leaflet.markercluster |
| **Décompression** | Pako (fichiers .geojson.gz) |
| **Tests** | Vitest 4 + Testing Library |
| **Déploiement** | GitHub Pages (gh-pages) |

## Source de donnees

Les donnees proviennent du fichier GeoJSON compresse publie par la Regie de l'energie du Quebec :

- **URL :** `https://regieessencequebec.ca/stations.geojson.gz`
- **Format :** GeoJSON compresse (gzip)
- **Mise a jour :** Temps reel (le frontend telecharge les donnees directement, aucun serveur intermediaire)

## Architecture

```
regieessencequebec.ca/stations.geojson.gz
          │
          ▼
  dataService.js  (fetch + decompression gzip + retry)
          │
          ▼
  useStations.js  (transformation GeoJSON → objets station)
          │
          ▼
  App.jsx  (filtrage par carburant, prix, rayon)
         ╱  │  ╲
        ▼   ▼   ▼
  MapMarkers  StationDrawer  MapController
  (marqueurs)  (tableau)     (vol + popup)
```

L'application est un site statique pur (pas de backend). Les donnees sont telechargees directement par le navigateur depuis la source externe.

## Development

### Prerequis

- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/) (v9+)

### Installation

```bash
# Installer les dependances
npm install

# Aller dans le repertoire frontend
cd frontend
npm install
```

### Commandes

| Commande | Description |
|---|---|
| `just dev` | Demarrer le serveur de development (Vite HMR) |
| `just build` | Generer la version de production |
| `just test` | Executer les tests interactifs |

Ou depuis le repertoire `frontend/` :

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de development (port local par defaut) |
| `npm run build` | Build de production dans `dist/` |
| `npm run preview` | Previsualiser le build de production |
| `npm run lint` | Executer ESLint |
| `npm run test` | Executer les tests en mode interactif |
| `npm run test:run` | Executer les tests en ligne de commande |
| `npm run test:coverage` | Generer un rapport de couverture de tests |
| `npm run deploy` | Deployer sur GitHub Pages |

## Structure du projet

```
RegieEssenceQuebec_v2/
├── frontend/                  # Application React/Vite
│   ├── public/
│   │   ├── cities.json        # Liste des villes du Quebec
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── og-social.png      # Image de partage social
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/           # Composants de la carte
│   │   │   │   ├── MapMarkers.jsx
│   │   │   │   ├── MapController.jsx
│   │   │   │   ├── MapClickHandler.jsx
│   │   │   │   ├── StationDrawer.jsx
│   │   │   │   ├── StationTable.jsx
│   │   │   │   ├── CitySearchInput.jsx
│   │   │   │   ├── FuelFilter.jsx
│   │   │   │   ├── PriceLegend.jsx
│   │   │   │   ├── UserLocationMarker.jsx
│   │   │   │   ├── GpsButton.jsx
│   │   │   │   ├── ZoomButtons.jsx
│   │   │   │   └── mapIcons.js
│   │   │   └── ErrorBoundary.jsx
│   │   ├── context/
│   │   │   ├── FilterContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── hooks/
│   │   │   ├── useStations.js
│   │   │   └── useIsMobile.js
│   │   ├── services/
│   │   │   └── dataService.js
│   │   ├── utils/
│   │   │   ├── geolocation.js
│   │   │   └── nominatimSearch.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── docs/
├── justfile
├── package.json
└── PROJECT_CONTEXT.md
```

## Deploiement

L'application est deploiee sur **GitHub Pages**.

```bash
# Build et deployment sur GitHub Pages
npm run deploy
```

Le chemin de base est `/RegieEssenceQC/` pour le sous-dossier du repository.

## Tests

```bash
cd frontend
npm run test        # Mode interactif
npm run test:run    # Mode ligne de commande
npm run test:coverage   # Avec rapport de couverture
```

## A propos

Cette application est un site statique qui consomme directement les donnees publiques de la Regie de l'energie du Quebec. Elle ne fait aucun lien avec la Regie de l'energie ni avec le gouvernement du Quebec.

Les donnees affichees sont fournies telles quelles par la source publique et peuvent contenir des erreurs. Cette application est fournie a titre informatif.
