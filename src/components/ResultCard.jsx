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
  if (status === 'pass') return '✓';
  if (status === 'fail') return '✗';
  return '~';
}

export default function ResultCard({ result }) {
  const { pass, flagCount, checks, extracted } = result;

  return (
    <div className="card">
      <div className="results-header">
        <div className="card-title" style={{ margin: 0 }}>
          Compliance Results
        </div>
        <div className={`verdict ${pass ? 'pass' : 'fail'}`}>
          {pass ? '✓ Cleared' : `✗ ${flagCount} Flag${flagCount !== 1 ? 's' : ''}`}
        </div>
      </div>

      <div className="check-list">
        {Object.entries(checks).map(([field, check]) => {
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
                {extracted?.[field] && status !== 'pass' && (
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    marginTop: '4px',
                    fontStyle: 'italic'
                  }}>
                    Found on label: "{extracted[field]}"
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!pass && (
        <div style={{
          marginTop: '20px',
          padding: '14px 16px',
          background: 'rgba(122, 31, 31, 0.08)',
          border: '1px solid rgba(212, 122, 122, 0.2)',
          borderRadius: 'var(--radius)',
          fontSize: '13px',
          color: 'var(--copper-light)',
          lineHeight: '1.6'
        }}>
          This label has {flagCount} issue{flagCount !== 1 ? 's' : ''} requiring
          attention before approval. Review flagged fields and request a corrected
          label submission where needed.
        </div>
      )}
    </div>
  );
}