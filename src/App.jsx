import { useState } from 'react';
import UploadZone from './components/UploadZone';
import ResultCard from './components/ResultCard';
import BatchQueue from './components/BatchQueue';

export default function App() {
  const [mode, setMode] = useState('single');
  const [labelFile, setLabelFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
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

  async function handleFileSelect(file) {
    setLabelFile(file);
    setResult(null);
    setError(null);
    setExtracted(null);

    setExtracting(true);

    const formData = new FormData();
    formData.append('label', file);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Extraction failed');

      const data = await res.json();
      setExtracted(data);

      setApplicationData(prev => ({
        ...prev,
        brandName: data.brandName || prev.brandName,
        classType: data.classType || prev.classType,
        alcoholContent: data.alcoholContent || prev.alcoholContent,
        netContents: data.netContents || prev.netContents,
        bottlerName: data.bottlerName || prev.bottlerName,
        bottlerAddress: data.bottlerAddress || prev.bottlerAddress,
      }));

    } catch (err) {
      // Silent fail on extraction — agent can still fill manually
    } finally {
      setExtracting(false);
    }
  }

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

  const canVerify = labelFile && applicationData.brandName && !verifying && !extracting;

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
            Upload a label image. Fields populate automatically from the label.
            Review, correct if needed, then run the compliance check.
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
                onFileSelect={handleFileSelect}
              />
              {extracting && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '14px',
                  fontSize: '13px',
                  color: 'var(--copper-light)'
                }}>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '1.5px', margin: 0 }} />
                  Reading label fields...
                </div>
              )}
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div className="card-title" style={{ margin: 0 }}>Application Data</div>
                {extracted && !extracting && (
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--pass)',
                    background: 'var(--pass-bg)',
                    border: '1px solid var(--pass-border)',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontWeight: '500',
                    letterSpacing: '0.04em'
                  }}>
                    Fields populated from label
                  </span>
                )}
              </div>

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
                {verifying ? 'Verifying...' : extracting ? 'Reading label...' : 'Run Compliance Check'}
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
                <div style={{ fontSize: '13px', color: '#D47A7A', lineHeight: '1.6' }}>
                  <strong style={{ display: 'block', marginBottom: '6px' }}>
                    Verification could not complete
                  </strong>
                  {error.includes('parse') || error.includes('unclear') || error.includes('extracted')
                    ? 'The image did not contain readable label data. Upload a clear, straight-on photo of the wine label.'
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