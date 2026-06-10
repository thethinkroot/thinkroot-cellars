import { useState, useRef } from 'react';

const FIELD_LABELS = {
  brandName: 'Brand Name',
  classType: 'Class / Type',
  alcoholContent: 'Alcohol Content',
  netContents: 'Net Contents',
  bottlerName: 'Bottler / Importer Name',
  bottlerAddress: 'Bottler / Importer Address',
  governmentWarning: 'Government Warning',
  countryOfOrigin: 'Country of Origin',
};

function getCheckStatus(check) {
  if (!check) return 'pass';
  if (!check.pass) return 'fail';
  if (check.exact === false && check.pass === true) return 'warn';
  return 'pass';
}

function getIndicator(status) {
  if (status === 'pass') return '\u2713';
  if (status === 'fail') return '\u2717';
  return '~';
}

function BatchResultDetail({ item }) {
  const [expanded, setExpanded] = useState(false);

  if (!item.result || item.status === 'pending' || item.status === 'processing') {
    return null;
  }

  return (
    <div style={{ marginTop: '8px' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '11px',
          color: 'var(--copper)',
          padding: '0',
          fontFamily: 'var(--font-ui)',
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {expanded ? 'Hide detail' : 'View compliance detail'}
      </button>

      {expanded && (
        <div style={{
          marginTop: '10px',
          borderTop: '1px solid rgba(197, 165, 114, 0.1)',
          paddingTop: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {Object.entries(item.result.checks).map(([field, check]) => {
            const status = getCheckStatus(check);
            return (
              <div key={field} className={`check-item ${status}`}>
                <div className="check-indicator">
                  {getIndicator(status)}
                </div>
                <div className="check-content">
                  <div className="check-field">
                    {FIELD_LABELS[field] || field}
                  </div>
                  <div className="check-reason">
                    {check?.reason || 'Not checked'}
                  </div>
                  {item.result.extracted?.[field] && status !== 'pass' && (
                    <div className="check-extracted">
                      Found on label: &quot;{item.result.extracted[field]}&quot;
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BatchQueue() {
  const [items, setItems] = useState([]);
  const [running, setRunning] = useState(false);
  const inputRef = useRef(null);

  function handleFiles(files) {
    const incoming = Array.from(files)
      .filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
      .map(f => ({
        id: `${f.name}-${Date.now()}`,
        file: f,
        filename: f.name,
        previewUrl: URL.createObjectURL(f),
        status: 'pending',
        result: null,
      }));
    setItems(prev => [...prev, ...incoming]);
  }

  async function runBatch() {
    if (items.length === 0 || running) return;
    setRunning(true);

    for (let i = 0; i < items.length; i++) {
      if (items[i].status !== 'pending') continue;

      setItems(prev =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: 'processing' } : item
        )
      );

      try {
        const extractForm = new FormData();
        extractForm.append('label', items[i].file);

        const extractRes = await fetch('/api/extract', {
          method: 'POST',
          body: extractForm,
        });

        const extracted = extractRes.ok ? await extractRes.json() : {};

        const domestic = ['united states', 'usa', 'u.s.a', 'us'];
        const isImport = extracted.countryOfOrigin
          ? !domestic.some(d =>
              extracted.countryOfOrigin.toLowerCase().includes(d))
          : (extracted.bottlerName || '').toLowerCase().includes('import');

        const verifyForm = new FormData();
        verifyForm.append('label', items[i].file);
        verifyForm.append('applicationData', JSON.stringify({
          brandName: extracted.brandName || '',
          classType: extracted.classType || '',
          alcoholContent: extracted.alcoholContent || '',
          netContents: extracted.netContents || '',
          bottlerName: extracted.bottlerName || '',
          bottlerAddress: extracted.bottlerAddress || '',
          isImport,
        }));

        const res = await fetch('/api/verify', {
          method: 'POST',
          body: verifyForm,
        });

        const data = await res.json();

        setItems(prev =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, status: data.pass ? 'pass' : 'fail', result: data }
              : item
          )
        );
      } catch {
        setItems(prev =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'fail', result: null } : item
          )
        );
      }
    }

    setRunning(false);
  }

  function exportCSV() {
    const rows = [
      ['Filename', 'Result', 'Flags', 'Brand Name', 'ABV', 'Government Warning', 'Country of Origin'],
      ...items.map(item => [
        item.filename,
        item.status === 'pass' ? 'Cleared' : 'Flagged',
        item.result?.flagCount ?? '',
        item.result?.extracted?.brandName ?? '',
        item.result?.extracted?.alcoholContent ?? '',
        item.result?.checks?.governmentWarning?.pass ? 'Pass' : 'Fail',
        item.result?.checks?.countryOfOrigin?.pass
          ? 'Pass'
          : item.result?.checks?.countryOfOrigin
          ? 'Fail'
          : 'Not checked',
      ])
    ];

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cola-verify-batch-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    setItems([]);
    setRunning(false);
  }

  const hasResults = items.some(i => i.status === 'pass' || i.status === 'fail');
  const pendingCount = items.filter(i => i.status === 'pending').length;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-title">Batch Verification</div>

        <div
          className="upload-zone"
          style={{ marginBottom: '20px' }}
          onClick={() => inputRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={e => handleFiles(e.target.files)}
          />
          <div className="upload-icon">&#8593;</div>
          <p>Drop label images here or click to browse</p>
          <span>Select multiple files up to 50 labels per batch</span>
        </div>

        {items.length > 0 && (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {items.length} label{items.length !== 1 ? 's' : ''} queued
                {hasResults && (
                  <>
                    {' · '}{items.filter(i => i.status === 'pass').length} cleared
                    {' · '}{items.filter(i => i.status === 'fail').length} flagged
                  </>
                )}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(26, 5, 9, 0.4)',
                    border: `1px solid ${
                      item.status === 'pass'
                        ? 'rgba(124, 184, 122, 0.25)'
                        : item.status === 'fail'
                        ? 'rgba(212, 122, 122, 0.25)'
                        : item.status === 'processing'
                        ? 'rgba(197, 165, 114, 0.3)'
                        : 'rgba(197, 165, 114, 0.1)'
                    }`,
                    borderRadius: 'var(--radius)',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.previewUrl && (
                      <img
                        src={item.previewUrl}
                        alt={item.filename}
                        style={{
                          width: '40px',
                          height: '50px',
                          objectFit: 'cover',
                          borderRadius: '3px',
                          border: '1px solid rgba(197, 165, 114, 0.2)',
                          flexShrink: 0
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: 'var(--cream-dim)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.result?.extracted?.brandName || item.filename}
                      </div>
                      {item.result?.extracted?.brandName && (
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                          {item.filename}
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {item.status === 'processing' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div
                            className="spinner"
                            style={{ width: '14px', height: '14px', borderWidth: '1.5px' }}
                          />
                          <span style={{ fontSize: '11px', color: 'var(--copper)' }}>
                            Checking...
                          </span>
                        </div>
                      ) : item.status === 'pass' ? (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          letterSpacing: '0.06em',
                          color: 'var(--pass)',
                          background: 'var(--pass-bg)',
                          border: '1px solid var(--pass-border)',
                          padding: '3px 10px',
                          borderRadius: '20px'
                        }}>
                          Cleared
                        </span>
                      ) : item.status === 'fail' ? (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          letterSpacing: '0.06em',
                          color: 'var(--fail)',
                          background: 'var(--fail-bg)',
                          border: '1px solid var(--fail-border)',
                          padding: '3px 10px',
                          borderRadius: '20px'
                        }}>
                          {item.result?.flagCount} Flag{item.result?.flagCount !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <BatchResultDetail item={item} />
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '20px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {pendingCount > 0 && (
                <button
                  className="btn-verify"
                  style={{ marginTop: 0, flex: 1, minWidth: '160px' }}
                  onClick={runBatch}
                  disabled={running}
                >
                  {running
                    ? 'Verifying...'
                    : `Verify ${pendingCount} Label${pendingCount !== 1 ? 's' : ''}`}
                </button>
              )}
              {hasResults && (
                <button className="btn-export" onClick={exportCSV}>
                  Export CSV
                </button>
              )}
              {!running && items.length > 0 && (
                <button className="btn-export" onClick={clearAll}>
                  Clear All
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}