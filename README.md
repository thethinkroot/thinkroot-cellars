# ThinkRoot Cellars -- COLA Verify

AI-powered TTB alcohol label compliance verification.

**Live application:** https://thinkroot-cellars-production.up.railway.app

Built by Chad Corriveau -- [github.com/thethinkroot](https://github.com/thethinkroot)

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

Opens on `http://localhost:5173`. The Vite dev server proxies `/api` calls to Express on port 3001 automatically.

---

## What I built and why

The TTB reviews approximately 150,000 alcohol beverage label applications per year. A team of 47 agents handles all of them, spending a significant portion of their time on routine field verification -- confirming that what appears on a label matches what was submitted in the application. Sarah Chen described it directly: agents check that a number on a form matches a number on a label, over and over.

This tool automates the extraction and comparison work. An agent uploads a label image, the tool reads the required fields using Claude Vision and populates the application data fields automatically, then runs each field against TTB compliance rules. Flags are returned with plain-language explanations so the agent knows exactly what requires review and why.

The goal is to reduce time spent on routine matching so agents can focus on judgment calls that actually require expertise.

---

## Single label vs batch mode

**Single label mode** is designed for agent-assisted case review. The agent uploads a label and the tool extracts all fields from the image automatically. In production, the application data would be pre-populated from the COLA system record. The agent reviews the extracted fields, corrects anything misread, and runs the compliance check. The tool compares what appears on the label against the application data field by field.

**Batch mode** is designed for high-volume importer submissions -- based on feedback about processing 200 to 300 label packages at once. Batch mode runs a TTB format compliance sweep across multiple labels without requiring individual application data entry. It checks government warning format, presence of required fields, and country of origin for detected imports. It is a triage pass, not a detailed application comparison. Labels that clear batch review may still require individual case review against their COLA application record.

These are two genuinely different workflows. Single label mode answers: does this label match what this applicant submitted? Batch mode answers: do all these labels meet TTB format requirements before we open individual applications?

---

## How it works

1. Agent uploads a label image (JPEG, PNG, or WebP)
2. Claude Vision extracts all required TTB fields from the image
3. Extracted fields populate the application data form automatically
4. Imported products are auto-detected from country of origin or importer statement on the label
5. Agent reviews and corrects any misread fields
6. Agent runs compliance check
7. Each field is compared against TTB rules and application data
8. Results returned field by field with pass, near-match, or fail status

---

## Compliance rules implemented

| Field | Rule | Regulation |
|---|---|---|
| Brand name | Fuzzy match, 90% similarity threshold | 27 CFR 4.32 |
| Class / type designation | Fuzzy match, 85% threshold | 27 CFR 4.32 |
| Alcohol content | Tolerance +/-1.5% over 14% ABV, +/-1.0% at or under; handles percentage and proof formats | TTB guidelines |
| Net contents | Near-exact match, 95% threshold | 27 CFR 4.32 |
| Bottler / importer name | Fuzzy match, 90% threshold | 27 CFR 4.34 |
| Bottler / importer address | Fuzzy match, 85% threshold | 27 CFR 4.34 |
| Government warning | Exact match required, all-caps GOVERNMENT WARNING: prefix enforced | 27 CFR part 16 |
| Country of origin | Required for all imports, auto-detected and checked | 19 CFR part 134 |

---

## Stack

- React and Vite (frontend)
- Node.js and Express (API)
- Claude Vision via Anthropic SDK -- claude-sonnet-4-5 (label extraction)
- Multer (image upload handling)
- Deployed on Railway

---

## Assumptions and decisions

**Fuzzy match thresholds** were set based on stakeholder context. Brand name and bottler name use 90% -- tight enough to catch real mismatches, loose enough to handle minor formatting variation. Dave Morrison's example of STONE'S THROW vs Stone's Throw was the deciding factor. Government warning uses exact match with a hard check for the all-caps prefix, per Jenny Park's feedback that agents reject labels for title-case violations.

**ABV tolerance** follows TTB guidelines -- plus or minus 1.5% for products over 14% ABV, plus or minus 1.0% at or under. The parser handles three label formats: percentage only (13.5%), proof only (90 Proof), and combined (45% Alc./Vol. (90 Proof)). When both appear on the label, percentage takes precedence. Proof is converted to ABV by dividing by two. Most implementations hard-fail any ABV difference; this one applies the correct regulatory tolerance and explains the result to the agent.

**Country of origin** is implemented as a CBP requirement under 19 CFR part 134, not a TTB requirement. The tool auto-detects imported products from the country of origin field or from the presence of an importer statement on the label. The check only runs when import status is confirmed.

**Auto-fill from image** fires immediately on upload before the agent fills any fields. This keeps the human in the loop while eliminating routine data entry. Fields populated by AI are marked with a copper indicator so the agent knows which values came from extraction versus which they entered manually.

**No COLA system integration** -- this is a standalone prototype per the project scope. A production version would pull application data directly from the COLA system API, eliminating manual field entry entirely and enabling the compliance check to run automatically when an agent opens a case.

---

## Trade-offs and limitations

Image quality affects extraction accuracy. Blurry, angled, or low-light label photos produce incomplete field extraction.

The government warning check validates wording and capitalization but cannot verify font size, weight, or placement, which are also regulated under 27 CFR part 16.

Batch processing runs sequentially to stay within API rate limits. A production version would use a job queue for volume processing.

No data persistence in this prototype. A production deployment would require document retention policies aligned with federal records requirements.

---

## Test labels

Six labels are included in the `test-labels/` folder covering wine, spirits, and all key compliance scenarios.

| Label | Scenario | Mode | Expected result |
|---|---|---|---|
| label-01-chateau-thinkroot-clean-pass.png | All fields correct, imported French wine | Single | Cleared |
| label-02-corriveau-reserve-gov-warning-fail.png | Government warning in title case | Single or Batch | Government Warning flagged |
| label-03-stones-throw-fuzzy-match.png | Brand name all-caps on label vs mixed case in application | Single -- enter mixed case brand name manually | Near-match, cleared |
| label-04-montalcino-noir-abv-tolerance.png | Label shows 14.5% ABV vs application showing 14.0% | Single -- enter 14.0% in Alcohol Content field | Within tolerance, cleared |
| label-05-chateauneuf-reserve-missing-origin.png | No country of origin on imported wine | Single or Batch | Country of origin flagged |
| label-06-old-tom-distillery-bourbon-proof.png | Distilled spirits label, ABV shown as 45% Alc./Vol. (90 Proof) | Single or Batch | Cleared |

Labels 3 and 4 demonstrate scenarios that require application data different from the label -- which reflects how TTB agents actually work. The COLA application was submitted before the label arrives for review. The agent has the application record; the tool compares the label against it.

Label 6 demonstrates proof-format ABV handling for distilled spirits. The TTB brief sample specifies this format explicitly; the compliance engine converts proof to ABV percentage for tolerance comparison.

---

## Production path

Moving this from prototype to production would require COLA system API integration to eliminate manual application data entry, FedRAMP-authorized infrastructure (the current Azure environment is noted as post-2019 migration), PII handling and document retention policies, and formal accuracy benchmarking against the existing agent review workflow. The compliance rules engine is production-ready and would require minimal modification for a live deployment.

---

*Treasury take-home assessment -- IT Specialist (AI), 26-DO-12891471-DH.*
*ThinkRoot Cellars is a fictional importer created for this project.*
