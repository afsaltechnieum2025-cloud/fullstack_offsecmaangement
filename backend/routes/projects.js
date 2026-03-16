// routes/projects.js
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ─────────────────────────────────────────────────────────────
//  GET /api/projects
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        p.*,
        COUNT(DISTINCT f.id)                                                         AS findings_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'critical' THEN f.id END)       AS critical_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'high'     THEN f.id END)       AS high_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'medium'   THEN f.id END)       AS medium_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'low'      THEN f.id END)       AS low_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'info'     THEN f.id END)       AS info_count,
        COUNT(DISTINCT pa.id)                                                         AS assignees_count
      FROM projects p
      LEFT JOIN findings            f  ON f.project_id  = p.id
      LEFT JOIN project_assignments pa ON pa.project_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    const projects = rows.map(row => ({
      ...row,
      ip_addresses:    row.ip_addresses
        ? (typeof row.ip_addresses === 'string' ? JSON.parse(row.ip_addresses) : row.ip_addresses)
        : null,
      findings_count:  Number(row.findings_count),
      critical_count:  Number(row.critical_count),
      high_count:      Number(row.high_count),
      medium_count:    Number(row.medium_count),
      low_count:       Number(row.low_count),
      info_count:      Number(row.info_count),
      assignees_count: Number(row.assignees_count),
    }));

    res.json(projects);
  } catch (err) {
    console.error('GET /api/projects error:', err);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/projects/:id
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        p.*,
        COUNT(DISTINCT f.id)                                                         AS findings_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'critical' THEN f.id END)       AS critical_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'high'     THEN f.id END)       AS high_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'medium'   THEN f.id END)       AS medium_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'low'      THEN f.id END)       AS low_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'info'     THEN f.id END)       AS info_count,
        COUNT(DISTINCT pa.id)                                                         AS assignees_count
      FROM projects p
      LEFT JOIN findings            f  ON f.project_id  = p.id
      LEFT JOIN project_assignments pa ON pa.project_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ message: 'Project not found' });

    const project = {
      ...rows[0],
      ip_addresses:    rows[0].ip_addresses
        ? (typeof rows[0].ip_addresses === 'string' ? JSON.parse(rows[0].ip_addresses) : rows[0].ip_addresses)
        : null,
      findings_count:  Number(rows[0].findings_count),
      critical_count:  Number(rows[0].critical_count),
      high_count:      Number(rows[0].high_count),
      medium_count:    Number(rows[0].medium_count),
      low_count:       Number(rows[0].low_count),
      info_count:      Number(rows[0].info_count),
      assignees_count: Number(rows[0].assignees_count),
    };

    res.json(project);
  } catch (err) {
    console.error('GET /api/projects/:id error:', err);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/projects
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    name,
    client,
    description  = null,
    domain,
    ip_addresses = null,
    start_date   = null,
    end_date     = null,
    created_by   = null,
    status       = 'active',
  } = req.body;

  if (!name || !client || !domain) {
    return res.status(400).json({ message: 'name, client, and domain are required' });
  }

  try {
    const [[{ newId }]] = await db.query(`SELECT UUID() AS newId`);

    await db.query(
      `INSERT INTO projects
        (id, name, client, description, domain, ip_addresses, start_date, end_date, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        name,
        client,
        description,
        domain,
        ip_addresses ? JSON.stringify(ip_addresses) : null,
        start_date || null,
        end_date   || null,
        created_by || null,
        status,
      ]
    );

    const [rows] = await db.query('SELECT * FROM projects WHERE id = ?', [newId]);
    const project = {
      ...rows[0],
      ip_addresses:    rows[0].ip_addresses ? JSON.parse(rows[0].ip_addresses) : null,
      findings_count:  0,
      critical_count:  0,
      high_count:      0,
      medium_count:    0,
      low_count:       0,
      info_count:      0,
      assignees_count: 0,
    };

    res.status(201).json(project);
  } catch (err) {
    console.error('POST /api/projects error:', err);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// ─────────────────────────────────────────────────────────────
//  DELETE /api/projects/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM projects WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/projects/:id error:', err);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/projects/:id/assignments
// ─────────────────────────────────────────────────────────────
router.post('/:id/assignments', async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }

  try {
    const [[{ newId }]] = await db.query(`SELECT UUID() AS newId`);

    await db.query(
      `INSERT INTO project_assignments (id, project_id, user_id) VALUES (?, ?, ?)`,
      [newId, req.params.id, user_id]
    );

    res.status(201).json({ message: 'Tester assigned successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Tester is already assigned to this project' });
    }
    console.error('POST /api/projects/:id/assignments error:', err);
    res.status(500).json({ message: 'Failed to assign tester' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/projects/:id/assignments
// ─────────────────────────────────────────────────────────────
router.get('/:id/assignments', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT pa.id, pa.user_id, pa.assigned_at, u.username
       FROM project_assignments pa
       LEFT JOIN users u ON u.id = pa.user_id
       WHERE pa.project_id = ?`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/projects/:id/assignments error:', err);
    res.status(500).json({ message: 'Failed to fetch assignments' });
  }
});

module.exports = router;