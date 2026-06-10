require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { verifyLabel, extractLabel } = require('./verify');
const upload = require('./upload');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/api/extract', upload.single('label'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No label image provided' });
    }
    const extracted = await extractLabel(req.file.buffer, req.file.mimetype);
    res.json(extracted);
  } catch (err) {
    console.error('Extraction error:', err.message);
    res.status(500).json({ error: 'Could not extract label data', detail: err.message });
  }
});

app.post('/api/verify', upload.single('label'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No label image provided' });
    }
    const applicationData = JSON.parse(req.body.applicationData || '{}');
    const result = await verifyLabel(req.file.buffer, applicationData, req.file.mimetype);
    res.json(result);
  } catch (err) {
    console.error('Verification error:', err.message);
    res.status(500).json({ error: 'Verification failed', detail: err.message });
  }
});

app.post('/api/verify-batch', upload.array('labels', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No label images provided' });
    }
    const applicationDataList = JSON.parse(req.body.applicationDataList || '[]');
    const results = await Promise.all(
      req.files.map((file, i) =>
        verifyLabel(file.buffer, applicationDataList[i] || {}, file.mimetype)
          .then(result => ({ file: file.originalname, ...result }))
          .catch(err => ({ file: file.originalname, error: err.message }))
      )
    );
    res.json({ results });
  } catch (err) {
    console.error('Batch verification error:', err.message);
    res.status(500).json({ error: 'Batch verification failed', detail: err.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`ThinkRoot Cellars — COLA Verify running on port ${PORT}`);
});