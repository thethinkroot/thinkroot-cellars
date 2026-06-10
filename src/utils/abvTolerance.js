// ABV tolerance rules per TTB guidelines
// Over 14% ABV: tolerance +/- 1.5%
// 14% and under: tolerance +/- 1.0%
//
// Handles three label formats:
//   "45% Alc./Vol."          -- percentage only
//   "90 Proof"               -- proof only (divide by 2 to get ABV)
//   "45% Alc./Vol. (90 Proof)" -- both (percentage takes precedence)

function parseAbv(value) {
  if (!value) return null;
  const str = value.toString();

  // Percentage match -- takes precedence over proof
  const pctMatch = str.match(/(\d+\.?\d*)\s*%/);
  if (pctMatch) return parseFloat(pctMatch[1]);

  // Proof-only match -- convert to ABV (proof / 2)
  const proofMatch = str.match(/(\d+\.?\d*)\s*[Pp]roof/);
  if (proofMatch) return parseFloat(proofMatch[1]) / 2;

  return null;
}

function checkAbvTolerance(labelAbvStr, applicationAbvStr) {
  const labelAbv = parseAbv(labelAbvStr);
  const applicationAbv = parseAbv(applicationAbvStr);

  if (labelAbv === null || applicationAbv === null) {
    return {
      pass: false,
      reason: 'Could not read ABV value from label or application'
    };
  }

  const tolerance = applicationAbv > 14 ? 1.5 : 1.0;
  const diff = Math.abs(labelAbv - applicationAbv);

  if (diff === 0) {
    return { pass: true, reason: 'Exact match', exact: true };
  }

  if (diff <= tolerance) {
    return {
      pass: true,
      exact: false,
      reason: `Within tolerance -- ${diff.toFixed(1)}% difference, allowable range +/-${tolerance}%`
    };
  }

  return {
    pass: false,
    exact: false,
    reason: `ABV outside tolerance -- label shows ${labelAbv}%, application shows ${applicationAbv}%, max allowed difference is +/-${tolerance}%`
  };
}

module.exports = { checkAbvTolerance, parseAbv };
