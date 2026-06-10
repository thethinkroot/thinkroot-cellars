import { useState, useRef } from 'react';

export default function UploadZone({ file, previewUrl, onFileSelect, onClear }) {
  const [dragging, setDragging] = useState(false);
  const [typeError, setTypeError] = useState(null);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function handleFileInput(e) {
    handleFile(e.target.files[0]);
  }

  function handleFile(f) {
    setTypeError(null);
    if (!f) return;

    if (f.type === 'image/heic' || f.type === 'image/heif') {
      setTypeError('iPhone HEIC files are not supported. Share the photo and select "Save as JPEG" first.');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setTypeError('Only JPEG, PNG, or WebP images are accepted.');
      return;
    }

    onFileSelect(f);
  }

  return (
    <div>
      {!previewUrl ? (
        <div
          className={`upload-zone ${dragging ? 'dragging' : ''}`}
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInput}
          />
          <div className="upload-icon">↑</div>
          <p>Drop a label photo here or click to browse</p>
          <span>JPEG, PNG, or WebP — photograph the label directly</span>
        </div>
      ) : (
        <div className="label-preview">
          <img src={previewUrl} alt="Uploaded label" />
          <div className="label-preview-caption">
            <span>{file?.name}</span>
            <button onClick={onClear}>Replace</button>
          </div>
        </div>
      )}

      {typeError && (
        <div style={{
          marginTop: '10px',
          padding: '10px 14px',
          background: 'rgba(122, 31, 31, 0.12)',
          border: '1px solid rgba(212, 122, 122, 0.3)',
          borderRadius: 'var(--radius)',
          fontSize: '12px',
          color: '#D47A7A',
          lineHeight: '1.5'
        }}>
          {typeError}
        </div>
      )}
    </div>
  );
}