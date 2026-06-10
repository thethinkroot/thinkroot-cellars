# Test Labels

Six labels for testing compliance scenarios in COLA Verify.

| File | Scenario | Expected Result |
|---|---|---|
| label-01-chateau-thinkroot-clean-pass.png | All fields correct, imported French wine | Cleared |
| label-02-corriveau-reserve-gov-warning-fail.png | Government warning in title case | Government Warning flagged |
| label-03-stones-throw-fuzzy-match.png | Brand name all-caps on label vs mixed case in application | Cleared (fuzzy match) |
| label-04-montalcino-noir-abv-tolerance.png | Label 14.5% vs application 14.0% | Cleared (within +/-1.0% tolerance) |
| label-05-chateauneuf-reserve-missing-origin.png | No country of origin on imported wine | Country of Origin flagged |
| label-06-old-tom-distillery-bourbon-proof.png | Distilled spirits label with proof-format ABV (90 Proof / 45%) | Cleared |

Upload each label to the live app at
https://thinkroot-cellars-production.up.railway.app
to test the corresponding scenario.
