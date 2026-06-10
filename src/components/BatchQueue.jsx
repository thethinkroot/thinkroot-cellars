import { useState, useRef } from 'react';

function statusLabel(status) {
  if (status === 'pending') return 'Pending';
  if (status === 'processing') return 'Checking...';
  if (status === 'pass') return 'Cleared';
  if (status === 'fail') return 'Flagged';
  return status;
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
        const formData = new FormData();
        formData.append('label', items[i].file);
        formData.append('applicationData', JSON.stringify({}));

        const res = await fetch('/api/verify', {
          method: 'POST',
          body: formData,
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
      ['Filename', 'Result', 'Flags', 'Brand Name', 'ABV', 'Government Warning'],
      ...items.map(item => [
        item.filename,
        item.status === 'pass' ? 'Cleared' : 'Flagged',
        item.result?.flagCount ?? '',
        item.result?.extracted?.brandName ?? '',
        item.result?.extracted?.alcoholContent ?? '',
        item.result?.checks?.governmentWarning?.pass ? 'Pass' : 'Fail',
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

  function clearCompleted() {
    setItems(prev => prev.filter(item => item.status === 'pending'));
  }

  const hasResults = items.some(i => i.status === 'pass' || i.status === 'fail');
  const pendingCount = items.filter(i => i.status === 'pending').length;

  return (
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
        <div className="upload-icon">↑</div>
        <p>Drop label images here or click to browse</p>
        <span>Select multiple files — up to 50 labels per batch</span>
      </div>

      {items.length > 0 && (
        <>
          <div className="batch-list">
            {items.map(item => (
              <div key={item.id} className="batch-item">
                <span className="filename">{item.filename}</span>
                <span className={`status ${item.status}`}>
                  {statusLabel(item.status)}
                  {item.result?.flagCount > 0 && (
                    <span style={{ marginLeft: '6px', opacity: 0.7 }}>
                      ({item.result.flagCount} flag{item.result.flagCount !== 1 ? 's' : ''})
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            {pendingCount > 0 && (
              <button
                className="btn-verify"
                style={{ marginTop: 0, width: 'auto', flex: 1 }}
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

            {hasResults && !running && (
              <button className="btn-export" onClick={clearCompleted}>
                Clear Completed
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}