import { useState, useRef } from 'react';
import UploadZone from './components/UploadZone';
import ResultCard from './components/ResultCard';
import BatchQueue from './components/BatchQueue';

export default function App() {
  const [mode, setMode] = useState('single');
  const [labelFile, setLabelFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [aiFilledFields, setAiFilledFields] = useState({});
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
  const [responseTime, setResponseTime] = useState(null);
  const startTimeRef = useRef(null);

  async function handleFileSelect(file) {
    setLabelFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setExtracted(null);
    setAiFilledFields({});
    setResponseTime(null);
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

      const filled = {};
      const updates = {};

      const fields = ['brandName', 'classType', 'alcoholContent', 'netContents', 'bottlerName', 'bottlerAddress'];
      fields.forEach(field => {
        if (data[field]) {
          updates[field] = data[field];
          filled[field] = true;
        }
      });

      const domestic = ['united states', 'usa', 'u.s.a', 'us'];
      const isImport =
        // Explicit "imported by" phrase anywhere on label
        data.isImportedProduct === true ||
        // Non-domestic country of origin
        (data.countryOfOrigin
          ? !domestic.some(d => data.countryOfOrigin.toLowerCase().includes(d))
          : false) ||
        // Fallback: "import" in extracted bottler name
        (data.bottlerName || '').toLowerCase().includes('import');

      if (isImport) {
        updates.isImport = true;
        filled.isImport = true;
      }

      setApplicationData(prev => ({ ...prev, ...updates }));
      setAiFilledFields(filled);

    } catch {
      // Silent fail -- agent fills manually
    } finally {
      setExtracting(false);
    }
  }

  function handleClear() {
    setLabelFile(null);
    setPreviewUrl(null);
    setExtracted(null);
    setAiFilledFields({});
    setResult(null);
    setError(null);
    setResponseTime(null);
    setApplicationData({
      brandName: '',
      classType: '',
      alcoholContent: '',
      netContents: '',
      bottlerName: '',
      bottlerAddress: '',
      isImport: false,
    });
  }

  async function handleVerify() {
    if (!labelFile) return;

    setVerifying(true);
    setResult(null);
    setError(null);
    startTimeRef.current = Date.now();

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
      const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
      setResponseTime(`${elapsed}s`);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  function handleFieldChange(field, value) {
    setApplicationData(prev => ({ ...prev, [field]: value }));
    setAiFilledFields(prev => ({ ...prev, [field]: false }));
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
            <div className="workspace">
              <div className="workspace-left">
                <div className="card">
                  <div className="card-title">Label Image</div>
                  <UploadZone
                    file={labelFile}
                    previewUrl={previewUrl}
                    onFileSelect={handleFileSelect}
                    onClear={handleClear}
                  />
                  {extracting && (
                    <div className="extraction-status reading">
                      <div
                        className="spinner"
                        style={{
                          width: '14px',
                          height: '14px',
                          borderWidth: '1.5px',
                          flexShrink: 0
                        }}
                      />
                      Reading label fields...
                    </div>
                  )}
                  {extracted && !extracting && (
                    <div className="extraction-status done">
                      Fields populated from label -- review before verifying
                    </div>
                  )}
                </div>

                {verifying && (
                  <div className="card verifying">
                    <div className="spinner" />
                    Analyzing against TTB requirements...
                  </div>
                )}

                {result && !verifying && (
                  <>
                    <ResultCard
                      result={result}
                      previewUrl={previewUrl}
                      responseTime={responseTime}
                    />
                    <button
                      className="btn-export"
                      style={{ width: '100%', marginTop: '12px' }}
                      onClick={handleClear}
                    >
                      Check Another Label
                    </button>
                  </>
                )}
              </div>

              <div className="workspace-right">
                <div className="card">
                  <div className="card-header-row">
                    <div className="card-title" style={{ margin: 0 }}>
                      Application Data
                    </div>
                    {Object.values(aiFilledFields).some(Boolean) && (
                      <span style={{
                        fontSize: '10px',
                        color: 'var(--copper)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        letterSpacing: '0.04em'
                      }}>
                        AI-assisted fields
                      </span>
                    )}
                  </div>

                  <p style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    margin: '0 0 16px 0',
                    lineHeight: '1.6',
                    borderLeft: '2px solid rgba(197, 165, 114, 0.3)',
                    paddingLeft: '12px'
                  }}>
                    Fields are populated from the label image. In production,
                    these would come from the COLA application record. Review
                    and correct any misread fields before running the check.
                  </p>

                  <div className="field-grid">
                    {[
                      { key: 'brandName', label: 'Brand Name', placeholder: 'e.g. Chateau ThinkRoot' },
                      { key: 'classType', label: 'Class / Type', placeholder: 'e.g. Bordeaux Superieur AOC' },
                      { key: 'alcoholContent', label: 'Alcohol Content', placeholder: 'e.g. 13.5%' },
                      { key: 'netContents', label: 'Net Contents', placeholder: 'e.g. 750 mL' },
                      { key: 'bottlerName', label: 'Bottler / Importer Name', placeholder: 'e.g. ThinkRoot Cellars' },
                      { key: 'bottlerAddress', label: 'Bottler / Importer Address', placeholder: 'e.g. San Diego, CA 92101' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key} className="field-group">
                        <label>{label}</label>
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder={placeholder}
                          value={applicationData[key]}
                          className={aiFilledFields[key] ? 'ai-filled' : ''}
                          onChange={e => handleFieldChange(key, e.target.value)}
                        />
                      </div>
                    ))}

                    <div className="field-group full-width">
                      <label className="import-toggle">
                        <input
                          type="checkbox"
                          checked={applicationData.isImport}
                          onChange={e => handleFieldChange('isImport', e.target.checked)}
                        />
                        This is an imported wine -- verify country of origin (19 CFR part 134)
                        {aiFilledFields.isImport && (
                          <span style={{
                            fontSize: '10px',
                            color: 'var(--copper)',
                            marginLeft: '6px'
                          }}>
                            auto-detected
                          </span>
                        )}
                      </label>
                    </div>
                  </div>

                  <button
                    className="btn-verify"
                    onClick={handleVerify}
                    disabled={!canVerify}
                  >
                    {verifying
                      ? 'Verifying...'
                      : extracting
                      ? 'Reading label...'
                      : 'Run Compliance Check'}
                  </button>

                  {error && (
                    <div style={{
                      marginTop: '14px',
                      padding: '12px 14px',
                      background: 'rgba(122, 31, 31, 0.1)',
                      border: '1px solid rgba(212, 122, 122, 0.25)',
                      borderRadius: 'var(--radius)',
                      fontSize: '12px',
                      color: '#D47A7A',
                      lineHeight: '1.6'
                    }}>
                      <strong style={{ display: 'block', marginBottom: '4px' }}>
                        Verification could not complete
                      </strong>
                      {error.includes('parse') || error.includes('unclear') || error.includes('extracted')
                        ? 'The image did not contain readable label data. Upload a clear, straight-on photo of the label.'
                        : error
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <BatchQueue />
        )}
      </main>

      <footer className="site-footer">
        ThinkRoot Cellars
        &nbsp;·&nbsp;
        COLA Verify
        &nbsp;·&nbsp;
        Built by Chad Corriveau
        &nbsp;·&nbsp;
        TTB compliance per 27 CFR 4.32, 4.34, CFR part 16
        &nbsp;·&nbsp;
        Country of origin per 19 CFR part 134
      </footer>
    </>
  );
}
