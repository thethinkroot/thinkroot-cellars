// TTB mandatory label requirements per 27 CFR 4.32, 4.34, and 27 CFR part 16
// Country of origin requirement per 19 CFR part 134 (CBP, applies to all imports)

const GOVT_WARNING_EXACT = 
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink " +
  "alcoholic beverages during pregnancy because of the risk of birth defects. " +
  "(2) Consumption of alcoholic beverages impairs your ability to drive a car or " +
  "operate machinery, and may cause health problems.";

const REQUIRED_FIELDS = [
  "brandName",
  "classType", 
  "alcoholContent",
  "netContents",
  "bottlerName",
  "bottlerAddress",
  "governmentWarning",
  "countryOfOrigin"
];

// ABV tolerance per TTB guidelines
// Wines over 14% ABV: tolerance is +/- 1.5%
// Wines 14% and under: tolerance is +/- 1.0%
function checkAbvTolerance(labelAbv, applicationAbv) {
  const label = parseFloat(labelAbv);
  const application = parseFloat(applicationAbv);

  if (isNaN(label) || isNaN(application)) {
    return { pass: false, reason: "Could not parse ABV values" };
  }

  const tolerance = application > 14 ? 1.5 : 1.0;
  const diff = Math.abs(label - application);

  if (diff <= tolerance) {
    return { 
      pass: true, 
      reason: diff === 0 ? "Exact match" : `Within tolerance (${diff.toFixed(1)}% difference, tolerance ±${tolerance}%)`
    };
  }

  return { 
    pass: false, 
    reason: `ABV mismatch exceeds tolerance. Label: ${label}%, Application: ${application}%, Tolerance: ±${tolerance}%`
  };
}

// Government warning must be exact — word for word, GOVERNMENT WARNING in all caps
// per Alcoholic Beverage Labeling Act of 1988 and 27 CFR part 16
function checkGovernmentWarning(labelWarning) {
  if (!labelWarning) {
    return { pass: false, reason: "Government warning statement not found on label" };
  }

  const normalized = labelWarning.replace(/\s+/g, " ").trim();
  const expected = GOVT_WARNING_EXACT.replace(/\s+/g, " ").trim();

  // Check for the all-caps GOVERNMENT WARNING prefix first
  if (!normalized.startsWith("GOVERNMENT WARNING:")) {
    if (normalized.toLowerCase().startsWith("government warning:")) {
      return { 
        pass: false, 
        reason: "Government warning prefix must be in all caps: GOVERNMENT WARNING: — title case detected" 
      };
    }
    return { 
      pass: false, 
      reason: "Government warning statement missing or does not begin with GOVERNMENT WARNING:" 
    };
  }

  if (normalized === expected) {
    return { pass: true, reason: "Exact match" };
  }

  return { 
    pass: false, 
    reason: "Government warning text does not match required wording per 27 CFR part 16" 
  };
}

module.exports = {
  REQUIRED_FIELDS,
  GOVT_WARNING_EXACT,
  checkAbvTolerance,
  checkGovernmentWarning
};