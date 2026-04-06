# Justfile for the RegieEssenceQuebec frontend application

FRONTEND_DIR := justfile_directory()/"frontend"

dev:
  cd {{FRONTEND_DIR}} && npm run dev

build:
  cd {{FRONTEND_DIR}} && npm run build

test:
  cd {{FRONTEND_DIR}} && npm test

default: dev
