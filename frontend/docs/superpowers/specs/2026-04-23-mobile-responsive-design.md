# Mobile Responsive — Regie Essence QC

## Objectif

Ajouter un layout responsive optimisé pour les téléphones mobiles (largeur < 768px) à l'application Regie Essence QC. La version desktop reste inchangée.

## Dépendances

- Ajouter `react-device-detect` pour le hook `useIsMobile()`

## Architecture

### Détection mobile

Un hook `useIsMobile` dans `src/hooks/` ajoute/retire automatiquement la class `.mobile` sur le `<body>` quand la taille de l'écran franchit le seuil de 767px. Cela permet de scoper tout le CSS mobile sans ambiguïté.

### CSS

Tout le CSS responsive est dans `src/index.css`, sous une section dédiée avec des sélecteurs `[data-theme="light"].mobile` et `[data-theme="dark"].mobile`. Le CSS mobile ne s'applique que lorsque la class `.mobile` est présente sur le body.

### Composants nouveaux

#### `MobileZoomButton.jsx` (dans `src/components/Map/`)

Bouton flottant qui remplace les contrôles de zoom (+/-) de Leaflet.

- Icône GPS SVG : cercle central (r=3), cercle extérieur (r=8), 4 rayons cardinaux
- Positionné en bas-gauche de la carte
- Comportement : zoom in / zoom out au clic, alterné ou bouton séparés
- Visible sur tous les écrans
- Cache les contrôles de zoom par défaut de Leaflet sur mobile

#### `StationDrawerButton.jsx` (dans `src/components/Map/`)

Bouton flottant "📋 Stations (N)" visible uniquement sur mobile.

- Positionné en bas-gauche
- Affiche le nombre de stations visibles
- Ouvre/ferme le drawer au clic
- Disparaît quand le drawer est ouvert

### Comportements

#### Header (overlay sur carte)

- Padding réduit sur mobile
- Inputs et boutons plus compacts
- Les éléments se réorganisent en wrap si nécessaire
- Taille de police réduite

#### Station Drawer

- Pleine largeur sur mobile (`left: 0; right: 0`)
- `bottom: 60px` pour laisser le bouton visible
- `max-height: 50vh` pour ne pas masquer toute la carte
- Scroll vertical pour la liste
- Bouton ✕ en haut à droite pour fermer
- Cliquez sur une ligne → ferme le drawer + vol vers la station sur la carte
- Disparaît sur desktop

#### Price Legend

- Repositionnée à `top: 120px` (sous le header)
- Padding et font-size réduits sur mobile
- Position inchangée sur desktop

#### Layout général

| Élément | Desktop | Mobile |
|---------|---------|--------|
| Header | `top/left/right: 12px` | `top/left/right: 8px`, plus compact |
| Map container | `calc(100vh - 60px)` | `calc(100vh - 50px)` |
| Station drawer | `left: 20px; min-width: 400px` | `left: 0; right: 0; max-height: 50vh` |
| Price legend | `top: 80px; left: 16px` | `top: 120px; right: 8px` |
| Zoom controls | Leaflet par défaut | Bouton GPS flottant |
| Station button | N/A | Bouton flottant bas-gauche |

## Fichier `src/index.css`

Ajout d'une section `/* === MOBILE RESPONSIVE === */` à la fin du fichier, avec les deux blocs :

```css
[data-theme="light"].mobile ... {
  /* styles mobile light mode */
}

[data-theme="dark"].mobile ... {
  /* styles mobile dark mode */
}
```

## Pas de changements

- `App.jsx` : pas de modifications (layout existant conservé)
- Composants Map : uniquement le nouveau bouton zoom
- `FilterContext.jsx` : pas de changement
- `useStations.js` : pas de changement
- Table des stations : le CSS gère le responsive, pas de changement JSX

## Tests

Tests additionnels après implémentation pour vérifier :
- Le hook `useIsMobile` détecte correctement les breakpoints
- La class `.mobile` est ajoutée/retirée correctement
- Le bouton GPS apparaît/remplace les contrôles Leaflet
- Le bouton "Stations" est visible uniquement sur mobile
- Le drawer s'ouvre et se ferme correctement
