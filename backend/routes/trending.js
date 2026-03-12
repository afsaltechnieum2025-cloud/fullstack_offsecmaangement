const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// GET all notes
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM trending_notes ORDER BY created_at DESC');
    const notes = rows.map(row => ({
      ...row,
      photoPreview: row.photo
        ? `data:${row.photo_mimetype};base64,${Buffer.from(row.photo).toString('base64')}`
        : null
    }));
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new note
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { name, link, description } = req.body;
    const photo = req.file ? req.file.buffer : null;
    const photo_mimetype = req.file ? req.file.mimetype : null;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    const [result] = await db.query(
      'INSERT INTO trending_notes (name, link, description, photo, photo_mimetype) VALUES (?, ?, ?, ?, ?)',
      [name, link || null, description, photo, photo_mimetype]
    );
    res.json({ id: result.insertId, message: 'Note saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE note
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM trending_notes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT - edit note
router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const { name, link, description } = req.body;
    const { id } = req.params;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    if (req.file) {
      // update with new photo
      await db.query(
        'UPDATE trending_notes SET name=?, link=?, description=?, photo=?, photo_mimetype=? WHERE id=?',
        [name, link || null, description, req.file.buffer, req.file.mimetype, id]
      );
    } else {
      // update without changing photo
      await db.query(
        'UPDATE trending_notes SET name=?, link=?, description=? WHERE id=?',
        [name, link || null, description, id]
      );
    }
    res.json({ message: 'Note updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;