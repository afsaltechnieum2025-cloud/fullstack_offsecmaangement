// routes/findings.js
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const multer  = require('multer');

// ─── Multer setup — store in memory, not disk ───────────────
const upload = multer({
  storage: multer.memoryStorage(),
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
    finding_type       = 'pentest',
    file_path          = null,
    line_number        = null,
    tool_name          = null,
    asset_type         = null,
    port               = null,
    protocol           = null,
    llm_category       = null,
    prompt_example     = null,
  } = req.body;

  const validSeverities = ['critical', 'high', 'medium', 'low', 'informational', 'info'];
  if (!project_id || !title || !severity) {
    return res.status(400).json({ message: 'project_id, title, and severity are required' });
  }
  if (!validSeverities.includes(String(severity).toLowerCase())) {
    return res.status(400).json({ message: `Invalid severity value: "${severity}".` });
  }

  const severityNormalized = String(severity).charAt(0).toUpperCase() + String(severity).slice(1).toLowerCase();
  const validFindingTypes  = ['pentest', 'sast', 'asm', 'llm'];
  const normalizedType     = validFindingTypes.includes(finding_type) ? finding_type : 'pentest';

  try {
    const [[{ newId }]] = await db.query(`SELECT UUID() AS newId`);
    await db.query(
      `INSERT INTO findings
        (id, project_id, title, description, severity, cvss_score, status,
         steps_to_reproduce, impact, remediation, affected_component, cwe_id, created_by,
         finding_type, file_path, line_number, tool_name, asset_type, port, protocol,
         llm_category, prompt_example)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, project_id, title, description, severityNormalized, cvss_score, status,
       steps_to_reproduce, impact, remediation, affected_component, cwe_id, created_by,
       normalizedType, file_path, line_number, tool_name, asset_type, port, protocol,
       llm_category, prompt_example]
    );
    const [rows] = await db.query('SELECT * FROM findings WHERE id = ?', [newId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/findings error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to create finding' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/findings/:id/pocs  ← returns base64 data URLs
// ─────────────────────────────────────────────────────────────
router.get('/:id/pocs', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, finding_id, file_name, mime_type, uploaded_by, uploaded_at, image_data FROM finding_pocs WHERE finding_id = ? ORDER BY uploaded_at ASC',
      [req.params.id]
    );

    // Convert binary image_data to base64 data URL
    const pocs = rows.map(row => {
      const mimeType = row.mime_type || 'image/jpeg';
      const base64   = row.image_data ? row.image_data.toString('base64') : null;
      return {
        id:          row.id,
        finding_id:  row.finding_id,
        file_name:   row.file_name,
        mime_type:   mimeType,
        uploaded_by: row.uploaded_by,
        uploaded_at: row.uploaded_at,
        // Frontend uses this directly as <img src=...>
        file_path:   base64 ? `data:${mimeType};base64,${base64}` : null,
      };
    });

    res.json(pocs);
  } catch (err) {
    console.error('GET /api/findings/:id/pocs error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to fetch POCs' });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/findings/:id/pocs — stores image in DB
// ─────────────────────────────────────────────────────────────
router.post('/:id/pocs', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const { uploaded_by = null } = req.body;
  const imageBuffer = req.file.buffer;
  const mimeType    = req.file.mimetype;
  const fileName    = req.file.originalname;

  try {
    const [[{ newId }]] = await db.query(`SELECT UUID() AS newId`);
    await db.query(
      `INSERT INTO finding_pocs (id, finding_id, file_path, file_name, mime_type, image_data, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newId, req.params.id, '', fileName, mimeType, imageBuffer, uploaded_by]
    );

    // Return base64 data URL so frontend can use it immediately
    const base64 = imageBuffer.toString('base64');
    res.status(201).json({
      id:          newId,
      finding_id:  req.params.id,
      file_name:   fileName,
      mime_type:   mimeType,
      uploaded_by: uploaded_by,
      uploaded_at: new Date().toISOString(),
      file_path:   `data:${mimeType};base64,${base64}`,
    });
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
      'SELECT id FROM finding_pocs WHERE id = ? AND finding_id = ?',
      [req.params.pocId, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'POC not found' });
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
    'finding_type', 'file_path', 'line_number', 'tool_name',
    'asset_type', 'port', 'protocol', 'llm_category', 'prompt_example'
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

// ─────────────────────────────────────────────────────────────
//  GET /api/findings/pocs/batch?finding_ids=id1,id2,id3
// ─────────────────────────────────────────────────────────────
router.get('/pocs/batch', async (req, res) => {
  const { finding_ids } = req.query;
  if (!finding_ids) {
    return res.status(400).json({ message: 'finding_ids query param is required' });
  }
  const ids          = finding_ids.split(',');
  const placeholders = ids.map(() => '?').join(',');
  try {
    const [rows] = await db.query(
      `SELECT id, finding_id, file_name, mime_type, uploaded_by, uploaded_at, image_data
       FROM finding_pocs WHERE finding_id IN (${placeholders}) ORDER BY uploaded_at ASC`,
      ids
    );
    const pocs = rows.map(row => {
      const mimeType = row.mime_type || 'image/jpeg';
      const base64   = row.image_data ? row.image_data.toString('base64') : null;
      return {
        id:          row.id,
        finding_id:  row.finding_id,
        file_name:   row.file_name,
        mime_type:   mimeType,
        uploaded_by: row.uploaded_by,
        uploaded_at: row.uploaded_at,
        file_path:   base64 ? `data:${mimeType};base64,${base64}` : null,
      };
    });
    res.json(pocs);
  } catch (err) {
    console.error('GET /api/findings/pocs/batch error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to fetch POCs' });
  }
});

module.exports = router;