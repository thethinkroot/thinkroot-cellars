import { useState } from 'react';
import UploadZone from './components/UploadZone';
import ResultCard from './components/ResultCard';
import BatchQueue from './components/BatchQueue';

export default function App() {
  const [mode, setMode] = useState('single');
  const [labelFile, setLabelFile] = useState(null);
  const [applicationData, setApplicationData] = useState({
    brandName: '',
    classType: '',
    alcoholContent: '',
    netContents: '',
    bottlerName: '',
    bottlerAddress: '',
    isImport: false,
  });
  const [result, setResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  async function handleVerify() {
    if (!labelFile) return;

    setVerifying(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('label', labelFile);
    formData.append('applicationData', JSON.stringify(applicationData));

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Verification failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  function handleFieldChange(field, value) {
    setApplicationData(prev => ({ ...prev, [field]: value }));
  }

  const canVerify = labelFile && applicationData.brandName && !verifying;

  return (
    <>
      <header className="site-header">
        <div className="site-wordmark">
          <span className="winery">ThinkRoot Cellars</span>
          <span className="product">COLA Verify</span>
        </div>
        <span className="tagline">TTB Label Compliance Review</span>
      </header>

      <main className="app-container">
        <div className="app-intro">
          <h1>Label Compliance Review</h1>
          <p>
            Upload a label image and enter the application data.
            The tool checks each required field against TTB regulations
            and flags anything that needs agent review.
          </p>
        </div>

        <div className="mode-toggle">
          <button
            className={mode === 'single' ? 'active' : ''}
            onClick={() => setMode('single')}
          >
            Single Label
          </button>
          <button
            className={mode === 'batch' ? 'active' : ''}
            onClick={() => setMode('batch')}
          >
            Batch Upload
          </button>
        </div>

        {mode === 'single' ? (
          <>
            <div className="card">
              <div className="card-title">Label Image</div>
              <UploadZone
                file={labelFile}
                onFileSelect={setLabelFile}
              />
            </div>

            <div className="card">
              <div className="card-title">Application Data</div>
              <div className="field-grid">
                <div className="field-group">
                  <label>Brand Name</label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. Château ThinkRoot"
                    value={applicationData.brandName}
                    onChange={e => handleFieldChange('brandName', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>Class / Type</label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. Bordeaux Supérieur AOC"
                    value={applicationData.classType}
                    onChange={e => handleFieldChange('classType', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>Alcohol Content</label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. 13.5%"
                    value={applicationData.alcoholContent}
                    onChange={e => handleFieldChange('alcoholContent', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>Net Contents</label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. 750 mL"
                    value={applicationData.netContents}
                    onChange={e => handleFieldChange('netContents', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>Bottler / Importer Name</label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. ThinkRoot Cellars"
                    value={applicationData.bottlerName}
                    onChange={e => handleFieldChange('bottlerName', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>Bottler / Importer Address</label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. San Diego, CA 92101"
                    value={applicationData.bottlerAddress}
                    onChange={e => handleFieldChange('bottlerAddress', e.target.value)}
                  />
                </div>

                <div className="field-group full-width">
                  <label className="import-toggle">
                    <input
                      type="checkbox"
                      checked={applicationData.isImport}
                      onChange={e => handleFieldChange('isImport', e.target.checked)}
                    />
                    This is an imported wine — verify country of origin (19 CFR part 134)
                  </label>
                </div>
              </div>

              <button
                className="btn-verify"
                onClick={handleVerify}
                disabled={!canVerify}
              >
                {verifying ? 'Verifying...' : 'Run Compliance Check'}
              </button>
            </div>

            {verifying && (
              <div className="card verifying">
                <div className="spinner" />
                Analyzing label against TTB requirements...
              </div>
            )}

            {error && (
              <div className="card">
                <div style={{
                  fontSize: '13px',
                  color: '#D47A7A',
                  lineHeight: '1.6'
                }}>
                  <strong style={{ display: 'block', marginBottom: '6px' }}>
                    Verification could not complete
                  </strong>
                  {error.includes('parse') || error.includes('unclear')
                    ? 'The image did not contain readable label data. Upload a clear, straight-on photo of the wine label — not a screenshot, not a document, not a photo of a computer screen.'
                    : error.includes('authentication') || error.includes('API')
                    ? 'Service configuration error. Please contact the administrator.'
                    : error
                  }
                </div>
              </div>
            )}

            {result && !verifying && (
              <ResultCard result={result} />
            )}
          </>
        ) : (
          <BatchQueue />
        )}
      </main>

      <footer className="site-footer">
        ThinkRoot Cellars · COLA Verify · Built by Chad Corriveau
        &nbsp;·&nbsp;
        TTB compliance per 27 CFR 4.32, 4.34, CFR part 16 · Country of origin per 19 CFR part 134
      </footer>
    </>
  );
}