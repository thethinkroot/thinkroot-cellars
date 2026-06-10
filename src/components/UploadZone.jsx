import { useState, useRef } from 'react';

export default function UploadZone({ file, onFileSelect }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && isValidImage(dropped)) {
      onFileSelect(dropped);
    }
  }

  function handleFileInput(e) {
    const selected = e.target.files[0];
    if (selected && isValidImage(selected)) {
      onFileSelect(selected);
    }
  }

  function isValidImage(f) {
    return ['image/jpeg', 'image/png', 'image/webp'].includes(f.type);
  }

  return (
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
          <p>Drop a label image here or click to browse</p>
          <span>JPEG, PNG, or WebP — 10MB max</span>
        </>
      )}
    </div>
  );
}