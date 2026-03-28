// routes/projects.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendProjectAssignmentEmail } = require('../utils/emailService');

// ─────────────────────────────────────────────────────────────
//  GET /api/projects/test-email
//  Test route: ?user_id=26&project_id=b5a5531d-...
//  Usage: hit this URL in browser to trigger a test email
// ─────────────────────────────────────────────────────────────
router.get('/test-email', async (req, res) => {
  const { user_id, project_id } = req.query;

  if (!user_id || !project_id) {
    return res.status(400).json({
      message: 'Both user_id and project_id query params are required',
      example: '/api/projects/test-email?user_id=26&project_id=b5a5531d-2919-11f1-a69b-c035323b6760',
    });
  }

  try {
    // Fetch project from DB — validates the project_id actually exists
    const [[project]] = await db.query(
      `SELECT id, name, client, start_date, end_date FROM projects WHERE id = ?`,
      [project_id]
    );

    if (!project) {
      return res.status(404).json({ message: `Project not found for id: ${project_id}` });
    }

    // Fetch user from DB — validates the user_id actually exists
    const [[user]] = await db.query(
      `SELECT id, name, full_name, email FROM users WHERE id = ?`,
      [user_id]
    );

    if (!user) {
      return res.status(404).json({ message: `User not found for id: ${user_id}` });
    }

    const toName  = user.full_name || user.name;
    const toEmail = user.email;

    // Log what we're about to send so you can verify in terminal
    console.log('[TEST EMAIL] Sending with data:', {
      toEmail,
      toName,
      projectName: project.name,
      clientName:  project.client,
      startDate:   project.start_date,
      endDate:     project.end_date,
      projectId:   project.id,
    });

    const result = await sendProjectAssignmentEmail({
      toEmail,
      toName,
      projectName: project.name,
      clientName:  project.client,
      startDate:   project.start_date,
      endDate:     project.end_date,
      assignedBy:  'Technieum Management (Test)',
      projectId:   project.id,
    });

    // Return full details so you can verify correct data was used
    res.json({
      success: true,
      message: `Test email sent successfully to ${toEmail}`,
      resend_id: result.id,
      sent_data: {
        to:          toEmail,
        name:        toName,
        project:     project.name,
        client:      project.client,
        start_date:  project.start_date,
        end_date:    project.end_date,
        project_id:  project.id,
      },
    });
  } catch (err) {
    console.error('[TEST EMAIL] Failed:', err.message);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

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
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'info'
                              OR LOWER(f.severity) = 'informational' THEN f.id END)  AS info_count,
        COUNT(DISTINCT pa.id)                                                         AS assignees_count
      FROM projects p
      LEFT JOIN findings            f  ON f.project_id  = p.id
      LEFT JOIN project_assignments pa ON pa.project_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    res.json(rows.map(row => ({
      ...row,
      ip_addresses: row.ip_addresses
        ? (typeof row.ip_addresses === 'string' ? JSON.parse(row.ip_addresses) : row.ip_addresses)
        : null,
      findings_count:  Number(row.findings_count),
      critical_count:  Number(row.critical_count),
      high_count:      Number(row.high_count),
      medium_count:    Number(row.medium_count),
      low_count:       Number(row.low_count),
      info_count:      Number(row.info_count),
      assignees_count: Number(row.assignees_count),
    })));
  } catch (err) {
    console.error('GET /api/projects error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to fetch projects' });
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
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'info'
                              OR LOWER(f.severity) = 'informational' THEN f.id END)  AS info_count,
        COUNT(DISTINCT pa.id)                                                         AS assignees_count
      FROM projects p
      LEFT JOIN findings            f  ON f.project_id  = p.id
      LEFT JOIN project_assignments pa ON pa.project_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ message: 'Project not found' });

    const row = rows[0];
    res.json({
      ...row,
      ip_addresses: row.ip_addresses
        ? (typeof row.ip_addresses === 'string' ? JSON.parse(row.ip_addresses) : row.ip_addresses)
        : null,
      findings_count:  Number(row.findings_count),
      critical_count:  Number(row.critical_count),
      high_count:      Number(row.high_count),
      medium_count:    Number(row.medium_count),
      low_count:       Number(row.low_count),
      info_count:      Number(row.info_count),
      assignees_count: Number(row.assignees_count),
    });
  } catch (err) {
    console.error('GET /api/projects/:id error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to fetch project' });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/projects
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    name, client, description = null, domain,
    ip_addresses = null, start_date = null, end_date = null,
    created_by = null, status = 'active',
  } = req.body;

  if (!name || !client || !domain) {
    return res.status(400).json({ message: 'name, client, and domain are required' });
  }

  try {
    const [[{ newId }]] = await db.query(`SELECT UUID() AS newId`);
    await db.query(
      `INSERT INTO projects (id, name, client, description, domain, ip_addresses, start_date, end_date, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, name, client, description, domain,
        ip_addresses ? JSON.stringify(ip_addresses) : null,
        start_date || null, end_date || null, created_by || null, status]
    );
    const [rows] = await db.query('SELECT * FROM projects WHERE id = ?', [newId]);
    res.status(201).json({
      ...rows[0],
      ip_addresses: rows[0].ip_addresses ? JSON.parse(rows[0].ip_addresses) : null,
      findings_count: 0, critical_count: 0, high_count: 0,
      medium_count: 0, low_count: 0, info_count: 0, assignees_count: 0,
    });
  } catch (err) {
    console.error('POST /api/projects error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to create project' });
  }
});

// ─────────────────────────────────────────────────────────────
//  PATCH /api/projects/:id
// ─────────────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  const allowed = [
    'name', 'client', 'description', 'domain',
    'ip_addresses', 'status', 'start_date', 'end_date',
  ];

  const keys = Object.keys(fields).filter(k => allowed.includes(k));
  const values = keys.map(k => {
    if (k === 'ip_addresses' && Array.isArray(fields[k])) {
      return JSON.stringify(fields[k]);
    }
    return fields[k];
  });

  if (keys.length === 0) {
    return res.status(400).json({ message: 'No valid fields to update' });
  }

  const setClauses = keys.map(k => `${k} = ?`).join(', ');

  try {
    const [result] = await db.query(
      `UPDATE projects SET ${setClauses} WHERE id = ?`,
      [...values, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const [rows] = await db.query(`
      SELECT
        p.*,
        COUNT(DISTINCT f.id)                                                         AS findings_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'critical' THEN f.id END)       AS critical_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'high'     THEN f.id END)       AS high_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'medium'   THEN f.id END)       AS medium_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'low'      THEN f.id END)       AS low_count,
        COUNT(DISTINCT CASE WHEN LOWER(f.severity) = 'info'
                              OR LOWER(f.severity) = 'informational' THEN f.id END)  AS info_count,
        COUNT(DISTINCT pa.id)                                                         AS assignees_count
      FROM projects p
      LEFT JOIN findings            f  ON f.project_id  = p.id
      LEFT JOIN project_assignments pa ON pa.project_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `, [id]);

    const row = rows[0];
    res.json({
      ...row,
      ip_addresses: row.ip_addresses
        ? (typeof row.ip_addresses === 'string' ? JSON.parse(row.ip_addresses) : row.ip_addresses)
        : null,
      findings_count:  Number(row.findings_count),
      critical_count:  Number(row.critical_count),
      high_count:      Number(row.high_count),
      medium_count:    Number(row.medium_count),
      low_count:       Number(row.low_count),
      info_count:      Number(row.info_count),
      assignees_count: Number(row.assignees_count),
    });
  } catch (err) {
    console.error('PATCH /api/projects/:id error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to update project' });
  }
});

// ─────────────────────────────────────────────────────────────
//  DELETE /api/projects/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/projects/:id error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to delete project' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/projects/:id/assignments
// ─────────────────────────────────────────────────────────────
router.get('/:id/assignments', async (req, res) => {
  try {
    const [assignments] = await db.query(
      `SELECT pa.id, pa.user_id, pa.assigned_at
       FROM project_assignments pa
       WHERE pa.project_id = ?
       ORDER BY pa.assigned_at ASC`,
      [req.params.id]
    );

    if (assignments.length === 0) return res.json([]);

    const userIds      = assignments.map(a => a.user_id);
    const placeholders = userIds.map(() => '?').join(',');
    const [users]      = await db.query(
      `SELECT id, name, full_name, email, role FROM users WHERE id IN (${placeholders})`,
      userIds
    );

    const userMap = {};
    users.forEach(u => {
      // users table has `name` column (not username) — use full_name if available
      userMap[String(u.id)] = u.full_name || u.name || u.email || String(u.id);
    });

    const result = assignments.map(a => ({
      ...a,
      username: userMap[String(a.user_id)] || String(a.user_id),
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /api/projects/:id/assignments error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to fetch assignments' });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/projects/:id/assignments
//  Assigns a tester and sends email notification
// ─────────────────────────────────────────────────────────────
router.post('/:id/assignments', async (req, res) => {
  const { user_id, assigned_by_id } = req.body;
  // assigned_by_id is optional — send it from the frontend if you want
  // the assigner's real name in the email (e.g. user.id from AuthContext)

  if (!user_id) return res.status(400).json({ message: 'user_id is required' });

  try {
    const [[{ newId }]] = await db.query(`SELECT UUID() AS newId`);
    await db.query(
      `INSERT INTO project_assignments (id, project_id, user_id) VALUES (?, ?, ?)`,
      [newId, req.params.id, user_id]
    );

    // ── EMAIL NOTIFICATION ────────────────────────────────────
    try {
      // Fetch full project data
      const [[project]] = await db.query(
        `SELECT id, name, client, start_date, end_date FROM projects WHERE id = ?`,
        [req.params.id]
      );

      // Fetch the assignee (person receiving the email)
      const [[assignee]] = await db.query(
        `SELECT id, name, full_name, email FROM users WHERE id = ?`,
        [user_id]
      );

      // Fetch the assigner's name if assigned_by_id was provided
      let assignerName = 'Technieum Management';
      if (assigned_by_id) {
        const [[assigner]] = await db.query(
          `SELECT name, full_name FROM users WHERE id = ?`,
          [assigned_by_id]
        );
        if (assigner) {
          assignerName = assigner.full_name || assigner.name;
        }
      }

      if (project && assignee && assignee.email) {
        const toName  = assignee.full_name || assignee.name;
        const toEmail = assignee.email;

        console.log(`[Email] Triggering assignment email → ${toEmail} (${toName}) for project "${project.name}" by "${assignerName}"`);

        // Fire-and-forget — email failure must NOT break the assignment response
        sendProjectAssignmentEmail({
          toEmail,
          toName,
          projectName: project.name,
          clientName:  project.client,
          startDate:   project.start_date,
          endDate:     project.end_date,
          assignedBy:  assignerName,
          projectId:   project.id,
        }).catch(e => console.error('[Email] Assignment notification failed:', e.message));

      } else {
        console.warn('[Email] Skipped — missing project, assignee, or email address', { project, assignee });
      }
    } catch (emailErr) {
      console.error('[Email] Lookup failed:', emailErr.message);
    }
    // ─────────────────────────────────────────────────────────

    res.status(201).json({ message: 'Tester assigned successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Tester is already assigned to this project' });
    }
    console.error('POST /api/projects/:id/assignments error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to assign tester' });
  }
});

// ─────────────────────────────────────────────────────────────
//  DELETE /api/projects/:id/assignments/:userId
// ─────────────────────────────────────────────────────────────
router.delete('/:id/assignments/:userId', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM project_assignments WHERE project_id = ? AND user_id = ?',
      [req.params.id, req.params.userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Assignment not found' });
    res.json({ message: 'Tester unassigned successfully' });
  } catch (err) {
    console.error('DELETE /api/projects/:id/assignments/:userId error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to unassign tester' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/projects/:id/checklist
// ─────────────────────────────────────────────────────────────
router.get('/:id/checklist', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM project_checklists WHERE project_id = ? ORDER BY checklist_type, category, item_key`,
      [req.params.id]
    );
    res.json(rows.map(r => ({ ...r, is_checked: Boolean(r.is_checked) })));
  } catch (err) {
    console.error('GET /projects/:id/checklist error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to fetch checklist' });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/projects/:id/checklist  — upsert a single item
// ─────────────────────────────────────────────────────────────
router.post('/:id/checklist', async (req, res) => {
  const { checklist_type, category, item_key, is_checked, updated_by } = req.body;

  if (!checklist_type || !category || !item_key) {
    return res.status(400).json({ message: 'checklist_type, category, and item_key are required' });
  }

  try {
    const [[{ newId }]] = await db.query(`SELECT UUID() AS newId`);

    await db.query(
      `INSERT INTO project_checklists
         (id, project_id, checklist_type, category, item_key, is_checked, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         is_checked = VALUES(is_checked),
         updated_by = VALUES(updated_by),
         updated_at = NOW()`,
      [newId, req.params.id, checklist_type, category, item_key, is_checked ? 1 : 0, updated_by || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('POST /projects/:id/checklist error:', err);
    res.status(500).json({ message: err.sqlMessage || err.message || 'Failed to save checklist item' });
  }
});

module.exports = router;