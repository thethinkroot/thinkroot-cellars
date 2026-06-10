import { useState, useRef } from 'react';

export default function UploadZone({ file, onFileSelect }) {
  const [dragging, setDragging] = useState(false);
  const [typeError, setTypeError] = useState(null);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    handleFile(dropped);
  }

  function handleFileInput(e) {
    const selected = e.target.files[0];
    handleFile(selected);
  }

  function handleFile(file) {
    setTypeError(null);
    if (!file) return;

    if (file.type === 'image/heic' || file.type === 'image/heif') {
      setTypeError('iPhone HEIC files are not supported. Share the photo and select "Save as JPEG" first.');
      return;
    }

    if (!isValidImage(file)) {
      setTypeError('Only JPEG, PNG, or WebP images are accepted.');
      return;
    }

    onFileSelect(file);
  }

  function isValidImage(f) {
    return ['image/jpeg', 'image/png', 'image/webp'].includes(f.type);
  }

  return (
    <div>
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

        {file ? (
          <>
            <div className="upload-icon">✓</div>
            <p style={{ color: 'var(--copper)' }}>{file.name}</p>
            <span>Click or drop to replace</span>
          </>
        ) : (
          <>
            <div className="upload-icon">↑</div>
            <p>Drop a label photo here or click to browse</p>
            <span>JPEG, PNG, or WebP — photograph the label directly, not a screenshot</span>
          </>
        )}
      </div>

      {typeError && (
        <div style={{
          marginTop: '10px',
          padding: '10px 14px',
          background: 'rgba(122, 31, 31, 0.12)',
          border: '1px solid rgba(212, 122, 122, 0.3)',
          borderRadius: 'var(--radius)',
          fontSize: '13px',
          color: '#D47A7A',
          lineHeight: '1.5'
        }}>
          {typeError}
        </div>
      )}
    </div>
  );
}