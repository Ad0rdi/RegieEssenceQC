# Project Context: RegieEssenceQuebec_v2

## Core Purpose
A web application that visualizes gas station fuel prices (Regular, Super, Diesel) in Quebec using an interactive map.

## Current Architecture (Transitioning)
- **Target Architecture:** Pure React/Vite static site.
- **Data Source:** Remote GeoJSON file: `https://regieessencequebec.ca/stations.geojson.gz`.
- **Frontend:** React, Vite, Leaflet, Leaflet.markercluster.
- **Backend (DEPRECATED):** Flask, Python, Pandas (being removed).

## Data Schema (Expected from GeoJSON)
- **Source:** `https://regieessencequebec.ca/stations.geojson.gz`
- **Format:** Compressed GeoJSON.
- **Key Properties (to be verified):**
    - Station name/ID.
    - Coordinates (lat/lng).
    - Fuel prices (Regular, Super, Diesel).
    - *Note: Data transformation layer required to normalize these to the frontend model.*

## Key Technical Decisions
- **Direct Data Consumption:** Moving from a local processed JSON to fetching a remote `.geojson.gz` file to eliminate backend maintenance and ensure real-time data.
- **Static Hosting:** Transitioning from a Flask server to a static site deployment for better performance and lower cost.
- **Removal of Python Stack:** Eliminating the Python/Flask/Pandas dependency to simplify the codebase and deployment pipeline.

## Project Structure
- `/frontend`: The React application (The primary codebase moving forward).
- `/`: Legacy backend files (To be removed).

## Status & Roadmap
- [x] **Phase 1: Knowledge Base Initialization** (COMPLETED)
- [x] **Phase 2: Frontend Data Integration** (COMPLETED)
- [x] **Phase 3: Project Cleanup** (COMPLETED)
- [ ] **Phase 4: Production Deployment** (PENDING)

**Current State:** The project has successfully transitioned from a Flask/Python backend to a pure React/Vite static architecture. Data is now consumed directly from a remote compressed GeoJSON source.
