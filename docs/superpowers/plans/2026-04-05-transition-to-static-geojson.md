# Transition to Static GeoJSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transition the application from a Flask-based backend to a pure React static site that consumes remote GeoJSON data.

**Architecture:** The application will move from a client-server model (Flask API) to a pure client-side model. React will fetch, decompress, and transform the GeoJSON data from `https://regieessencequebec.ca/stations.geojson.gz` directly in the browser.

**Tech Stack:** React, Vite, Leaflet, Leaflet.markercluster, pako (for decompression).

---

### Task 1: Knowledge Base & Plan Setup

**Files:**
- Create: `PROJECT_CONTEXT.md` (Done)
- Create: `docs/superpowers/plans/2026-04-05-transition-to-static-geojson.md`

- [ ] **Step 1: Initialize project context**
  (Already completed in the previous step)

- [ ] **Step 2: Save this plan to the official directory**

```bash
mkdir -p docs/superpowers/plans
# This step will be handled by the agent writing the file
```

### Task 2: Frontend Data Integration

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/services/dataService.js`
- Create: `frontend/src/hooks/useStations.js`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add decompression dependency**
  Install `pako` to handle `.gz` files in the browser.
  Run: `cd frontend && npm install pako`

- [ ] **Step 2: Implement Data Service**
  Create `frontend/src/services/dataService.js` to fetch and decompress the GeoJSON.

```javascript
import pako from 'pako';

const GEOJSON_URL = 'https://regieessencequebec.ca/stations.geojson.gz';

export const fetchStations = async () => {
  const response = await fetch(GEOJSON_URL);
  if (!response.ok) throw new Error('Network response was not ok');
  
  const arrayBuffer = await response.arrayBuffer();
  const decompressed = pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
  return JSON.parse(decompressed);
};
```

- [ ] **Step 3: Implement Data Transformation & Hook**
  Create `frontend/src/hooks/useStations.js` to manage loading, error, and station state.

- [ ] **Step 4: Update App.jsx**
  Connect the `useStations` hook to the Leaflet map component.

- [ ] **Step 5: Verify Frontend**
  Run `npm run dev` in `frontend/` and check the browser console and map.

### Task 3: Project Cleanup

**Files:**
- Delete: `app.py`
- Delete: `process_data.py`
- Delete: `data.json`
- Delete: `stations-*.xlsx`
- Delete: `requirements.txt`
- Delete: `frontend/src/App.css` (if no longer needed)

- [ ] **Step 1: Delete backend files**
  Run: `rm app.py process_data.py data.json requirements.txt stations-*.xlsx`

- [ ] **Step 2: Cleanup Frontend**
  Remove any legacy imports or styles related to the old API structure.

### Task 4: Final Verification

- [ ] **Step 1: Build check**
  Run: `cd frontend && npm run build`
  Expected: SUCCESS

- [ ] **Step 2: Update Context**
  Finalize `PROJECT_CONTEXT.md`.
