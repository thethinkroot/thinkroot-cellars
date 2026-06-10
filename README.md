# ThinkRoot Cellars — COLA Verify

AI-powered TTB alcohol label compliance verification.

**Live application:** https://thinkroot-cellars-production.up.railway.app

Built by Chad Corriveau — [github.com/thethinkroot](https://github.com/thethinkroot)

---

## Setup

Requires Node.js 18+ and an Anthropic API key.

```bash
git clone https://github.com/thethinkroot/thinkroot-cellars.git
cd thinkroot-cellars
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm run dev
```

Opens on `http://localhost:5173`. The Vite dev server proxies `/api` calls to Express on port 3001 automatically — no separate server startup needed.

---

## What I built and why

The core problem from the discovery notes is straightforward: 47 agents processing 150,000 applications per year, spending most of their time on field matching that is essentially data entry verification. Sarah Chen described it directly — agents check that a number on a form matches a number on a label, over and over.

I built a two-stage tool. Stage one reads the label image using Claude Vision and populates the application data fields automatically. Stage two runs each field through a compliance rules engine and returns a plain-language result per field. The agent reviews the auto-populated fields, corrects anything misread, and hits verify. The routine matching work is handled by the tool. The judgment calls stay with the agent.

The single/batch toggle addresses Janet's longstanding request for batch processing. Batch results export to CSV.

---

## Approach and tools

**Frontend:** React + Vite. Component-per-field architecture maps directly to the TTB checklist, which made the UX logic straightforward.

**Backend:** Node.js + Express + Multer. No framework overhead — appropriate to prototype scope.

**AI:** Claude Vision (claude-sonnet-4-5) via the Anthropic SDK. Used for label field extraction. Chosen because it handles the image-to-structured-data problem in a single call with no additional OCR pipeline, which is what kept the previous vendor's processing time under the 5-second threshold agents require.

**Deployed:** Railway. Serves the Express API and built React frontend from a single process.

---

## Compliance rules

| Field | Rule | Regulation |
|---|---|---|
| Brand name | Fuzzy match, 90% threshold | 27 CFR 4.32 |
| Class / type | Fuzzy match, 85% threshold | 27 CFR 4.32 |
| Alcohol content | ±1.5% tolerance over 14% ABV, ±1.0% at or under | TTB guidelines |
| Net contents | Near-exact match, 95% threshold | 27 CFR 4.32 |
| Bottler / importer name | Fuzzy match, 90% threshold | 27 CFR 4.34 |
| Bottler / importer address | Fuzzy match, 85% threshold | 27 CFR 4.34 |
| Government warning | Exact match, GOVERNMENT WARNING: all-caps enforced | 27 CFR part 16 |
| Country of origin | Required for imports, checked when import flag is set | 19 CFR part 134 |

---

## Assumptions

**Fuzzy matching over exact matching for most fields.** Dave Morrison's "STONE'S THROW" vs "Stone's Throw" example was the deciding factor. An exact-match approach would generate false rejections on case variation and minor punctuation differences. The tool flags near-matches for agent review rather than auto-rejecting — judgment stays with the agent.

**Government warning is exact match, no exceptions.** Jenny Park was specific: agents reject for title-case violations, smaller font, any deviation from the required wording. The tool checks for the all-caps GOVERNMENT WARNING: prefix first, then the full text. This is the field where creative submissions are most common and where agent review time is most justified.

**ABV tolerance applied correctly.** TTB allows ±1.5% for wines over 14% ABV and ±1.0% at or under. Most implementations hard-fail any ABV difference. This one applies the regulatory tolerance and explains the result — within tolerance vs. outside tolerance — rather than returning a binary pass/fail.

**Country of origin from CBP, not TTB.** This field is required under 19 CFR part 134 (CBP) for all imported beverages, not TTB regulations. It only runs when the agent marks the submission as an import. Many label checkers miss this field entirely.

**Auto-fill is an assist, not a decision.** Fields populate from the label image automatically on upload. The agent reviews and corrects before running the compliance check. This keeps the human-in-the-loop principle intact while eliminating routine data entry.

---

## Trade-offs

Image quality affects extraction. Blurry or angled photos produce incomplete field reads — the tool surfaces this as a clear error rather than a silent failure.

The government warning check validates wording and capitalization but cannot verify font size, weight, or placement, which are also regulated under 27 CFR part 16.

Batch processing runs sequentially to stay within API rate limits. For the volume TTB handles, a production version would need a job queue.

No data persistence in this prototype. A production deployment would require document retention policies aligned with federal records requirements.

---

## Production path

The prototype demonstrates the extraction and comparison logic. Moving to production would mean integrating with the COLA system API to pull application data automatically — eliminating manual field entry entirely. Infrastructure would need to meet FedRAMP authorization requirements. The compliance rules engine is production-ready as written and would need minimal modification for a live deployment. The bigger work is COLA integration, data retention, and audit logging — not the AI layer.

---

*Treasury take-home assessment — IT Specialist (AI), 26-DO-12891471-DH.*
*ThinkRoot Cellars is a fictional importer created for this project.*
