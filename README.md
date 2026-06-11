# ThinkRoot Cellars: COLA Verify

AI-powered TTB alcohol label compliance verification.

**Live application:** https://thinkroot-cellars-production.up.railway.app

Built by Chad Corriveau - [github.com/thethinkroot](https://github.com/thethinkroot)

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

150,000 applications a year. 47 agents. Half their day is confirming that a number on a form matches a number on a label.

That is the problem. The previous vendor pilot failed not because the technology was wrong but because it was slow. Thirty to forty seconds per label, and agents went back to doing it by eye. Sarah was direct about the requirement: results in about 5 seconds or agents will not use it. Dave was direct about something else: the tool needs judgment, not just pattern matching. STONE'S THROW on a label versus Stone's Throw in an application is not a failure. It is obviously the same brand, and a tool that flags it as a mismatch will get ignored. Jenny flagged the government warning as the one place where exact is exact. All caps, word for word, no exceptions.

I built toward those three constraints specifically. Fast extraction using Claude Vision. Fuzzy matching with tunable thresholds so case variation and minor formatting differences pass. Hard exact matching on the government warning because Jenny is right that people try to get creative with it.

The wrapper concept, ThinkRoot Cellars as a fictional importer, gave me a concrete frame to build against. It also meant the test labels could cover real scenarios rather than abstract ones.

---

## Two modes, two different problems

The single label and batch modes are not the same workflow presented twice. They solve different things.

Single label mode is for case review. An agent has a COLA application open and needs to check the label artwork against it. The tool reads the label image, populates the application data fields automatically, and the agent reviews and corrects before running the check. In production, the application data would come directly from the COLA system. The auto-fill is a prototype stand-in for that integration. The compliance check then compares label against application, field by field, with a plain-language result for each one.

Batch mode is for the peak-season problem Sarah described, where an importer submits 200 or 300 labels at once. There is no practical way to run those against individual application records in a batch flow. What agents actually need is a fast triage pass: which of these have obvious format problems before we open individual cases? Batch mode runs TTB format compliance across the full set, covering government warning, required fields, and country of origin for detected imports, then returns a cleared or flagged result per label with expandable detail and CSV export.

The distinction matters. Single label mode answers: does this label match what this applicant submitted? Batch mode answers: are there any obvious problems in this stack before we start opening applications?

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

## Compliance rules

| Field | Rule | Regulation |
|---|---|---|
| Brand name | Fuzzy match, 90% similarity threshold | 27 CFR 4.32 |
| Class / type designation | Fuzzy match, 85% threshold | 27 CFR 4.32 |
| Alcohol content | Tolerance +/-1.5% over 14% ABV, +/-1.0% at or under; handles percentage and proof formats | TTB guidelines |
| Net contents | Near-exact match, 95% threshold | 27 CFR 4.32 |
| Bottler / importer name | Fuzzy match, 90% threshold | 27 CFR 4.34 |
| Bottler / importer address | Fuzzy match, 85% threshold | 27 CFR 4.34 |
| Government warning | Exact match required, all-caps GOVERNMENT WARNING: prefix enforced | 27 CFR part 16 |
| Country of origin | Required for all imported products, auto-detected and checked | 19 CFR part 134 |

---

## Stack

- React and Vite (frontend)
- Node.js and Express (API)
- Claude Vision via Anthropic SDK, claude-sonnet-4-5 (label extraction)
- Multer (image upload handling)
- Deployed on Railway

---

## Decisions worth explaining

**Fuzzy match thresholds.** Brand name and bottler name sit at 90%. Government warning is exact. Everything else falls between 85% and 95% depending on how much variation is reasonable for that field. The thresholds were not picked arbitrarily. Dave's STONE'S THROW example was the anchor. A tool that flags obvious case variation as a real mismatch will lose agent trust fast, and once it loses trust it gets ignored. The fuzzy thresholds are calibrated to surface real problems, not formatting noise.

**ABV tolerance.** TTB allows plus or minus 1.5% for products over 14% ABV and plus or minus 1.0% at or under. Most implementations hard-fail any ABV difference, which is wrong and would generate false flags constantly. This one applies the actual regulatory tolerance and tells the agent exactly what the difference is and whether it falls within range. The parser also handles three label formats: percentage only, proof only, and combined. Proof divides by two. When both appear, percentage takes precedence. The brief's sample label showed the combined format explicitly, and that was not an accident.

**Country of origin.** This is a CBP requirement under 19 CFR part 134, not a TTB requirement. The distinction matters because it changes what regulation you cite when you reject a label. Import detection runs three ways: explicit "imported by" phrase on the label, non-domestic country of origin in the extracted fields, or "import" in the bottler name as a fallback. The check only runs when one of those three conditions is true.

**Auto-fill and the human in the loop.** Fields populate automatically on upload, but the agent reviews them before anything runs. Fields that came from AI extraction are marked with a copper left border so the agent knows exactly which values to scrutinize. The tool eliminates the extraction work, not the agent's judgment. An agent who trusts the tool because it is transparent about what it did is more useful than one who rubber-stamps results because they cannot tell what happened.

**No COLA integration.** Standalone prototype, per the project scope. A production version would pull application data from the COLA system API and the manual field entry step disappears entirely.

---

## Trade-offs and limitations

Response times in testing run 7 to 9 seconds. Sarah's requirement was about 5. The gap is real. A production deployment would address this through caching of common extraction patterns, a dedicated inference endpoint, and pre-population from the COLA system that eliminates the extraction round-trip for fields already in the record.

The government warning check validates wording and capitalization but cannot verify font size, weight, or placement. Those are also regulated under 27 CFR part 16 and would require a different detection approach, likely bounding box analysis, to check programmatically.

Batch processing is sequential to stay within API rate limits. Production volume would require a job queue.

Image quality affects extraction accuracy. The tool handles well-lit, straight-on label photos reliably. Angled shots, glare, and low resolution degrade extraction quality. Jenny raised this in her interview. It is a real workflow problem that a production version would need to address, likely through image preprocessing before the Vision call.

---

## AI governance

The Claude API call is the part of this architecture that carries the most scrutiny in a federal context, and it should.

Every label image uploaded to this prototype leaves the network boundary and goes to a commercial API endpoint. That is acceptable for a proof-of-concept that does not touch live COLA application data. It is not acceptable for production. The path forward is routing extraction through a FedRAMP-authorized deployment. Anthropic is on that path, and the existing Azure infrastructure is the natural landing zone for a TTB production instance. Marcus flagged the Azure migration and the FedRAMP process in the same breath, which tells you the agency already knows how that conversation goes.

The more important governance point is the one baked into the architecture itself. The AI does one thing: it reads an image and returns field values. Every compliance decision after that, the fuzzy match comparison, the ABV tolerance calculation, the government warning check, the country of origin logic, is deterministic code in `src/rules/` and `src/utils/`. An auditor reviewing a rejected label can trace exactly what happened and why without any visibility into model behavior. That separation was intentional. In a regulatory workflow, you cannot have a black box making compliance calls. The AI handles the part that would otherwise be manual data entry. The rules handle the part that determines outcomes.

Nothing is stored. Images process in memory and discard. No label artwork, no extracted fields, no agent actions persist in this prototype. Production would need a formal retention policy tied to TTB's document schedule and federal records requirements. That is a policy question, not a hard technical problem.

---

## Test labels

Six labels in `test-labels/` covering wine, spirits, and all key compliance scenarios.

| Label | Scenario | Mode | Expected result |
|---|---|---|---|
| label-01-chateau-thinkroot-clean-pass.png | All fields correct, imported French wine | Single | Cleared |
| label-02-corriveau-reserve-gov-warning-fail.png | Government warning in title case | Single or Batch | Government Warning flagged |
| label-03-stones-throw-fuzzy-match.png | Brand name all-caps on label vs mixed case in application | Single, enter mixed case brand name manually | Near-match, cleared |
| label-04-montalcino-noir-abv-tolerance.png | Label shows 14.5% ABV vs application showing 14.0% | Single, enter 14.0% in Alcohol Content field | Within tolerance, cleared |
| label-05-chateauneuf-reserve-missing-origin.png | No country of origin on imported product | Single or Batch | Country of origin flagged |
| label-06-old-tom-distillery-bourbon-proof.png | Distilled spirits, ABV shown as 45% Alc./Vol. (90 Proof) | Single or Batch | Cleared |

Labels 3 and 4 require manually entering application data that differs from the label, which is the actual TTB agent workflow. The COLA application was submitted before the label arrived. The agent has the record. The tool compares the label against it.

Label 6 covers distilled spirits and the proof-format ABV the brief's sample label specified. The compliance engine converts proof to percentage for the tolerance comparison.

---

## Production path

The compliance rules engine is production-ready. The fuzzy match thresholds, ABV tolerance logic, government warning check, and country of origin detection would need minimal modification for a live deployment.

Everything else requires real work. COLA system API integration to replace manual field entry and enable automatic pre-population when an agent opens a case. FedRAMP-authorized infrastructure for the extraction layer, using the existing Azure environment as the deployment target. Data governance policy covering retention, audit logging, and PII handling. Accuracy benchmarking against the existing agent review workflow to establish a baseline before anything replaces manual review.

The prototype demonstrates that the core approach works. Whether it works well enough to replace agent review on routine cases, and what the error rate looks like on edge cases, requires production data to answer.

---

*Treasury take-home assessment - IT Specialist (AI), 26-DO-12891471-DH.*
*ThinkRoot Cellars is a fictional importer created for this project.*
