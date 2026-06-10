require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { checkGovernmentWarning } = require('../src/rules/ttbRules');
const { fuzzyMatch } = require('../src/utils/fuzzyMatch');
const { checkAbvTolerance } = require('../src/utils/abvTolerance');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXTRACTION_PROMPT = `You are a TTB label compliance assistant. Extract the following fields from this alcohol beverage label image. Return only valid JSON, no markdown, no explanation.

Fields to extract:
- brandName: the brand name as it appears on the label
- classType: the class and type designation (e.g. "Bordeaux Supérieur AOC", "Kentucky Straight Bourbon Whiskey")
- alcoholContent: ABV as shown on label (e.g. "13.5%")
- netContents: volume (e.g. "750 mL")
- bottlerName: name of bottler, producer, or importer
- bottlerAddress: address of bottler, producer, or importer
- governmentWarning: the full government warning text exactly as it appears
- countryOfOrigin: country of origin if shown

If a field is not visible or legible, return null for that field.

Return format:
{
  "brandName": "...",
  "classType": "...",
  "alcoholContent": "...",
  "netContents": "...",
  "bottlerName": "...",
  "bottlerAddress": "...",
  "governmentWarning": "...",
  "countryOfOrigin": "..."
}`;

async function verifyLabel(imageBuffer, applicationData) {
  const base64Image = imageBuffer.toString('base64');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image
            }
          },
          {
            type: 'text',
            text: EXTRACTION_PROMPT
          }
        ]
      }
    ]
  });

  const rawText = response.content[0].text.trim();
  let extracted;

  try {
    extracted = JSON.parse(rawText);
  } catch {
    throw new Error('Could not parse label data from image. The label may be unclear or at an angle.');
  }

  return runComplianceChecks(extracted, applicationData);
}

function runComplianceChecks(extracted, application) {
  const checks = {};

  // Brand name — fuzzy match, 90% threshold
  checks.brandName = fuzzyMatch(
    extracted.brandName,
    application.brandName,
    0.9
  );

  // Class/type — fuzzy match
  checks.classType = fuzzyMatch(
    extracted.classType,
    application.classType,
    0.85
  );

  // ABV — tolerance-based check
  checks.alcoholContent = checkAbvTolerance(
    extracted.alcoholContent,
    application.alcoholContent
  );

  // Net contents — exact after normalization
  checks.netContents = fuzzyMatch(
    extracted.netContents,
    application.netContents,
    0.95
  );

  // Bottler name — fuzzy match
  checks.bottlerName = fuzzyMatch(
    extracted.bottlerName,
    application.bottlerName,
    0.9
  );

  // Bottler address — fuzzy match
  checks.bottlerAddress = fuzzyMatch(
    extracted.bottlerAddress,
    application.bottlerAddress,
    0.85
  );

  // Government warning — exact check, no tolerance
  checks.governmentWarning = checkGovernmentWarning(extracted.governmentWarning);

  // Country of origin — required for imports per 19 CFR part 134
  if (application.isImport) {
    checks.countryOfOrigin = extracted.countryOfOrigin
      ? { pass: true, reason: `Country of origin present: ${extracted.countryOfOrigin}` }
      : { pass: false, reason: 'Country of origin required for imported wine (19 CFR part 134) — not found on label' };
  }

  const flags = Object.entries(checks).filter(([, v]) => !v.pass);
  const overallPass = flags.length === 0;

  return {
    pass: overallPass,
    flagCount: flags.length,
    extracted,
    checks
  };
}

module.exports = { verifyLabel };