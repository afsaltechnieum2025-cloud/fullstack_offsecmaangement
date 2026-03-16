// routes/findings.js
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// ─── Multer setup for POC image uploads ───────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads', 'pocs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only JPEG and PNG files are allowed'));
  },
});

// ─────────────────────────────────────────────────────────────
//  GET /api/findings?project_id=<uuid>
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { project_id } = req.query;
  if (!project_id) {
    return res.status(400).json({ message: 'project_id query param is required' });
  }
  try {
    const [rows] = await db.query(
      `SELECT * FROM findings WHERE project_id = ? ORDER BY
        CASE LOWER(severity)
          WHEN 'critical'      THEN 0
          WHEN 'high'          THEN 1
          WHEN 'medium'        THEN 2
          WHEN 'low'           THEN 3
          WHEN 'informational' THEN 4
          ELSE 5
        END ASC, created_at DESC`,
      [project_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/findings error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to fetch findings' });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/findings
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    project_id,
    title,
    description        = null,
    severity,
    cvss_score         = null,
    status             = 'Open',
    steps_to_reproduce = null,
    impact             = null,
    remediation        = null,
    affected_component = null,
    cwe_id             = null,
    created_by         = null,
  } = req.body;

  if (!project_id || !title || !severity) {
    return res.status(400).json({ message: 'project_id, title, and severity are required' });
  }

  try {
    const [[{ newId }]] = await db.query(`SELECT UUID() AS newId`);
    await db.query(
      `INSERT INTO findings
        (id, project_id, title, description, severity, cvss_score, status,
         steps_to_reproduce, impact, remediation, affected_component, cwe_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, project_id, title, description, severity, cvss_score, status,
       steps_to_reproduce, impact, remediation, affected_component, cwe_id, created_by]
    );
    const [rows] = await db.query('SELECT * FROM findings WHERE id = ?', [newId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/findings error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to create finding' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/findings/:id/pocs   ← MUST be before /:id
// ─────────────────────────────────────────────────────────────
router.get('/:id/pocs', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM finding_pocs WHERE finding_id = ? ORDER BY uploaded_at ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/findings/:id/pocs error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to fetch POCs' });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/findings/:id/pocs
// ─────────────────────────────────────────────────────────────
router.post('/:id/pocs', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const { uploaded_by = null } = req.body;
  const file_path = `/uploads/pocs/${req.file.filename}`;
  try {
    const [[{ newId }]] = await db.query(`SELECT UUID() AS newId`);
    await db.query(
      `INSERT INTO finding_pocs (id, finding_id, file_path, file_name, uploaded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [newId, req.params.id, file_path, req.file.originalname, uploaded_by]
    );
    const [rows] = await db.query('SELECT * FROM finding_pocs WHERE id = ?', [newId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/findings/:id/pocs error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to save POC' });
  }
});

// ─────────────────────────────────────────────────────────────
//  DELETE /api/findings/:id/pocs/:pocId
// ─────────────────────────────────────────────────────────────
router.delete('/:id/pocs/:pocId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM finding_pocs WHERE id = ? AND finding_id = ?',
      [req.params.pocId, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'POC not found' });
    const filePath = path.join(__dirname, '..', rows[0].file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await db.query('DELETE FROM finding_pocs WHERE id = ?', [req.params.pocId]);
    res.json({ message: 'POC deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/findings/:id/pocs/:pocId error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to delete POC' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/findings/:id
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM findings WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Finding not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/findings/:id error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to fetch finding' });
  }
});

// ─────────────────────────────────────────────────────────────
//  PATCH /api/findings/:id
// ─────────────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const allowed = [
    'title', 'description', 'severity', 'cvss_score', 'status',
    'steps_to_reproduce', 'impact', 'remediation', 'affected_component',
    'cwe_id', 'retest_status', 'retest_date', 'retest_notes', 'retested_by',
  ];
  const updates = Object.entries(req.body)
    .filter(([key]) => allowed.includes(key))
    .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No valid fields to update' });
  }
  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values     = [...Object.values(updates), req.params.id];
  try {
    const [result] = await db.query(`UPDATE findings SET ${setClauses} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Finding not found' });
    const [rows] = await db.query('SELECT * FROM findings WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH /api/findings/:id error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to update finding' });
  }
});

// ─────────────────────────────────────────────────────────────
//  DELETE /api/findings/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM findings WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Finding not found' });
    res.json({ message: 'Finding deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/findings/:id error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to delete finding' });
  }
});

module.exports = router;