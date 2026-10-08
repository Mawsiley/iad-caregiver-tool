# Database schema — iad-caregiver

Firestore project: `mawsiley-db-2893` · path: `apps/iad-caregiver/<collection>/<docId>`
Accessed **only** by `netlify/functions/api.js` (never from the browser).
Test namespace used by local tests: `apps/iad-caregiver-test/…`

| Collection | Doc ID | Fields | Written by | Read by |
|---|---|---|---|---|
| `users` | normalized phone | phone, name, role (`assistant`\|`doctor`), status (`active`\|`pending`\|`disabled`), specialty, org, salt, passwordHash (PBKDF2), lastLoginAt | register / login / admin | server only (admin sees list without hashes) |
| `records` | `<examId>_<regionId>` | examId, type (`exam`\|`iad-urine`…), patientCode (anonymous), ageBand, sex, regionId, findings (`id:severity\|…`), redFlags, pain, urgency, change (`new`\|`worse`\|`better`\|`same`), notes, examAt, assistantId, assistantName | assistants (sync) | admin export (future) |
| `insights` | regionId | records, findings.{findingId}: count, urgency.{level}: count — anonymous counters, incremented on sync | server | doctors, admin |
| `contributions` | client id `c-…` | type (`approve`\|`edit`\|`new`\|`comment`), regionId, findingId, lang, fields {name, lookFor, earlyCare[], treatment[], redFlags[]}, comment, reference, urgency, doctorId, doctorName, doctorStatus, status (`new`\|`accepted`\|`rejected`), adminNote, submittedAt | doctors | the doctor (own), admin |

Common fields on every doc: `createdAt`, `updatedAt`, `deleted`.
Sync is idempotent: existing doc IDs are skipped, so retries never duplicate data.

## Indexes
None required — all queries use equality filters only (`deleted == false`, optional `doctorId == …`) and sort in memory.

| Collection group | Fields | State |
|---|---|---|
| — | — | — |

## Not stored here
- Settings-admin credentials: Netlify env only (`SETTINGS_ADMIN_PASSWORD_HASH/SALT`, `SETTINGS_ADMIN_PEPPER`).
- Patient names: the app uses anonymous patient codes only.
