# IAD Caregiver Digital Tool — Clinical Map v1

A mobile-first web app that guides family caregivers through a skin check after every urine / stool diaper change, using an interactive **3D body map of an older adult**. Built to prevent and catch **Incontinence-Associated Dermatitis (IAD)** early.

English + Arabic (RTL), with spoken voice prompts.

## Modules (v2 — development phase)

| Module | For | What it does |
|---|---|---|
| **Body check** `#/exam` | Health assistants | Choose an anonymous patient code → tap **any of 34 body parts** on the 3D body → record findings (with severity), pain 0–10, danger signs and notes → get **early care, simple treatment and when-to-refer** advice. Each part is compared with the previous check of the same patient (**new / worse / better / same**) for early detection. |
| **IAD skin check** `#/iad` | Caregivers | The original clinical map v1 (below). |
| **Records** `#/records` | Assistants | Patients and their checks over time. |
| **Doctor tool** `#/doctor` | Doctors | Review the advice for every body part: mark **correct**, **suggest a change**, **add a new finding**, or comment. Shows anonymous counts of what assistants find. Input is collected for the **next version**. |
| **Admin** `#/admin` | Settings admin | System status, verify doctor accounts, accept/reject doctor contributions, export JSON/CSV. |

Data is **local-first**: everything is saved on the device and synced to Firestore when the user is signed in and online.
Knowledge base: `src/data/knowledge.js` (draft — to be reviewed by doctors). Database schema: [`docs/db-schema.md`](docs/db-schema.md).

```
React (Vite) ──▶ Netlify Function  netlify/functions/api.js   (JWT, PBKDF2, settings admin from env only)
                     └──▶ Firestore  apps/iad-caregiver/{users, records, insights, contributions}
```

Settings admin password (run on your own computer, then add the 3 values to Netlify env):

```bash
node scripts/admin-hash.mjs "your-admin-password"
```

Database check / backup (uses the local service-account key, never uploaded):

```bash
node scripts/db-check.js iad-caregiver
node scripts/db-backup.js iad-caregiver
```

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
- three.js via `@react-three/fiber` and `@react-three/drei`
- **Human 3D body** (`src/body/sculpt.js`): an older adult sculpted as a signed distance field of ~90 smoothly blended anatomical shapes (face, glasses, hands with fingers, knees, calves, buttocks…), meshed with marching cubes in a Web Worker. No external model files.
- **Skin zones** (`src/body/zoneClassify.js`) are painted directly on the skin by a shader, and the same rules turn a tap on the body into the tapped area
- **Voice prompts**: natural neural voices pre-recorded to `public/audio/{ar,en}/*.mp3`, so Arabic works on every device even without an Arabic system voice. After editing any prompt text in `src/i18n.js`, regenerate with `npm run audio`
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
