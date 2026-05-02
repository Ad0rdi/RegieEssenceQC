# Social Media Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Open Graph and Twitter Card meta tags with an OG image so the site link shows a proper preview when shared on social media.

**Architecture:** Static HTML `<head>` meta tags + a 1200x630 PNG image in `public/`. No changes to React app code.

**Tech Stack:** HTML meta tags, CSS styling, Pillow for image generation.

---

## Task 1: Add Open Graph and Twitter Card meta tags

**Files:**
- Modify: `frontend/index.html:1-31`

- [ ] **Step 1: Update `<title>` tag**

Change from:
```html
<title>frontend</title>
```

To:
```html
<title>Régie Essence Québec - Prix d'Essence en Temps Réel</title>
```

- [ ] **Step 2: Add SEO meta tags**

After the viewport meta tag, add:
```html
<meta name="description" content="Carte interactive des prix d'essence au Québec. Comparez les prix de regular, super et diesel à proximité en temps réel." />
<meta name="keywords" content="prix essence, Québec, carburant, station-service, carte, régie essence" />
```

- [ ] **Step 3: Add Open Graph meta tags**

Add after SEO tags:
```html
<meta property="og:type" content="website" />
<meta property="og:url" content="https://Ad0rdi.github.io/RegieEssenceQC/" />
<meta property="og:title" content="Régie Essence Québec - Prix d'Essence" />
<meta property="og:description" content="Carte interactive des prix d'essence au Québec. Comparez les prix de regular, super et diesel en temps réel." />
<meta property="og:image" content="https://Ad0rdi.github.io/RegieEssenceQC/og-image.png" />
```

- [ ] **Step 4: Add Twitter Card meta tags**

Add after OG tags:
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://Ad0rdi.github.io/RegieEssenceQC/" />
<meta name="twitter:title" content="Régie Essence Québec - Prix d'Essence" />
<meta name="twitter:description" content="Carte interactive des prix d'essence au Québec. Comparez les prix de regular, super et diesel en temps réel." />
<meta name="twitter:image" content="https://Ad0rdi.github.io/RegieEssenceQC/og-image.png" />
```

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html
git commit -m "feat: add social media preview meta tags"
```

## Task 2: Create OG Image

**Files:**
- Create: `frontend/public/og-image.png`

- [ ] **Step 1: Generate 1200x630 PNG with Pillow**

Create `frontend/public/og-image.png` with:
- Background: dark green gradient (#1a472a to #2d6a4f)
- Title: "Régie Essence Québec" in white/green
- Subtitle: "Prix d'essence en temps réel"
- Fuel type badges: Regular, Super, Diesel
- URL at bottom

Python generation script:
```python
from PIL import Image, ImageDraw, ImageFont

img = Image.new('RGB', (1200, 630), (26, 71, 42))
draw = ImageDraw.Draw(img)
# ... draw title, subtitle, fuel badges, URL
img.save('frontend/public/og-image.png', 'PNG')
```

- [ ] **Step 2: Verify image**

```bash
file frontend/public/og-image.png
# Expected: PNG image data, 1200 x 630, 8-bit/color RGB
```

- [ ] **Step 3: Commit**

```bash
git add frontend/public/og-image.png
git commit -m "feat: add 1200x630 OG image for social media preview"
```

## Task 3: Verify

- [ ] **Step 1: Run tests**

```bash
npm run test:run
# Expected: all 63 tests pass
```

- [ ] **Step 2: Build**

```bash
npm run build
# Expected: build succeeds without errors
```

- [ ] **Step 3: Verify meta tags**

Check `dist/index.html` contains all OG and Twitter meta tags with correct URLs.

---

## Verification Checklist

- [x] All OG properties present (type, url, title, description, image)
- [x] All Twitter Card properties present (card, url, title, description, image)
- [x] OG image is 1200x630 PNG (recommended size for Facebook/Twitter)
- [x] og:image URL is absolute (required by all social platforms)
- [x] og:image location: `public/og-image.png` → served at root of GitHub Pages
- [x] No React code changes required
- [x] All existing tests still pass
- [x] Build succeeds
