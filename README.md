# IAD Caregiver Digital Tool — Clinical Map v1

A mobile-first web app that guides family caregivers through a skin check after every urine / stool diaper change, using an interactive **3D body map of an older adult**. Built to prevent and catch **Incontinence-Associated Dermatitis (IAD)** early.

English + Arabic (RTL), with spoken voice prompts.

## Flow (from the clinical map)

| Screen | What happens |
|---|---|
| **Start** | Caregiver starts a check at a urine / stool / diaper change |
| **1 — Diaper** | 3D figure (front/back) wearing a diaper. 🔊 *"What is in the diaper?"* → **Urine / Stool / Both** |
| **2 — Body map** | Diaper removed. Skin exposed to urine and/or stool **glows**. 🔊 *"Check the skin in the highlighted areas."* Caregiver taps each area (on the 3D model or in the list) |
| **3 — Checked area** | Zooms to the area. Reminds the caregiver to compare with the person's usual skin. 🔊 *"Does the skin look different from usual?"* → **Looks the same** (smooth / intact) or **Something has changed** |
| **4B — Identify the change** | 🔊 *"What change do you see?"* Large visual choices, multi-select: color change · wet/soft skin · broken/peeling · spots/rash · pain/burning/itching |
| **4A — Protect the skin** | Step-by-step with images: **clean gently → pat dry (don't rub) → apply skin protectant** |
| **Report** | Summary on the 3D map (green = usual, red = changed): *healthy* / *watch* / *report to nurse today*. Share or copy the report. Saved to on-device history |

### Areas highlighted

- **Urine:** lower belly, genital area, groin folds, inner thighs, perineum, buttocks
- **Stool:** perianal area / buttock fold, buttocks, perineum, sacrum, back of thighs
- **Both:** all of the above

## Tech

- React 19 + Vite
- three.js via `@react-three/fiber` and `@react-three/drei` — the body is procedurally modelled (no external model files); skin zones are surface patches on the body so they can be tapped and coloured
- Web Speech API for voice prompts
- `localStorage` for history (stays on the device; nothing is sent to a server)

## Run locally

```bash
npm install
npm run dev
```

## Deploy

- **Netlify:** `netlify.toml` is included (build `npm run build`, publish `dist`).
- **GitHub Pages:** `.github/workflows/deploy.yml` builds and deploys on every push to `main`.

> This tool supports care at home. It does not replace advice from a nurse or doctor.
