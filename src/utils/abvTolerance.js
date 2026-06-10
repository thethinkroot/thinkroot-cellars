// ABV tolerance rules per TTB guidelines
// Over 14% ABV: tolerance +/- 1.5%
// 14% and under: tolerance +/- 1.0%

function parseAbv(value) {
    if (!value) return null;
    const match = value.toString().match(/(\d+\.?\d*)\s*%/);
    return match ? parseFloat(match[1]) : null;
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
        return { pass: true, reason: 'Exact match' };
  }

  if (diff <= tolerance) {
        return {
                pass: true,
                reason: `Within tolerance — ${diff.toFixed(1)}% difference, allowable range +/-${tolerance}%`
        };
  }

  return {
        pass: false,
        reason: `ABV outside tolerance — label shows ${labelAbv}%, application shows ${applicationAbv}%, max allowed difference is +/-${tolerance}%`
  };
}

module.exports = { checkAbvTolerance, parseAbv };
