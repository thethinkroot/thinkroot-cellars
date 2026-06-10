# Test Labels

Five labels for testing compliance scenarios in COLA Verify.

| File | Scenario | Expected Result |
|---|---|---|
| label-01-chateau-thinkroot-clean-pass.png | All fields correct | ✓ Cleared |
| label-02-corriveau-reserve-gov-warning-fail.png | Government warning in title case | ✗ Government Warning flagged |
| label-03-stones-throw-fuzzy-match.png | Brand name all-caps vs mixed case | ~ Near match, agent review |
| label-04-montalcino-noir-abv-tolerance.png | Label 14.5% vs application 14.0% | ✓ Within ±1.5% tolerance |
| label-05-chateauneuf-reserve-missing-origin.png | No country of origin on imported wine | ✗ Country of origin flagged |

Upload each label to the live app at
https://thinkroot-cellars-production.up.railway.app
to test the corresponding scenario.