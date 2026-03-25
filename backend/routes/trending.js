const express  = require('express');
const router   = express.Router();
const db       = require('../db');
const multer   = require('multer');

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — increased for HEIC from phones
  fileFilter: (req, file, cb) => {
    // Accept all image types including HEIC/HEIF from iPhones
    const allowed = /image\//i;
    const allowedExt = /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif)$/i;
    if (allowed.test(file.mimetype) || allowedExt.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(null, false); // silently skip instead of error
    }
  },
});

// ─── Run once: add category column if it doesn't exist ───────────────────────
// You can also run this SQL manually:
// ALTER TABLE trending_notes ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'others';
(async () => {
  try {
    await db.query(`
      ALTER TABLE trending_notes
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'others'
    `);
  } catch (e) {
    // Column may already exist — safe to ignore
  }
})();

// ─── GET all notes ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM trending_notes ORDER BY created_at DESC');
    const notes  = rows.map(row => ({
      ...row,
      category: row.category || 'others',
      photoPreview: row.photo
        ? `data:${row.photo_mimetype || 'image/png'};base64,${Buffer.from(row.photo).toString('base64')}`
        : null,
    }));
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST new note ────────────────────────────────────────────────────────────
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { name, link, description, category } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    const photo          = req.file ? req.file.buffer   : null;
    const photo_mimetype = req.file ? req.file.mimetype : null;
    const cat            = category || 'others';

    const [result] = await db.query(
      'INSERT INTO trending_notes (name, link, description, photo, photo_mimetype, category) VALUES (?, ?, ?, ?, ?, ?)',
      [name, link || null, description, photo, photo_mimetype, cat]
    );
    res.json({ id: result.insertId, message: 'Note saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT (edit) note ──────────────────────────────────────────────────────────
router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const { name, link, description, category } = req.body;
    const { id } = req.params;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    const cat = category || 'others';

    if (req.file) {
      await db.query(
        'UPDATE trending_notes SET name=?, link=?, description=?, photo=?, photo_mimetype=?, category=? WHERE id=?',
        [name, link || null, description, req.file.buffer, req.file.mimetype, cat, id]
      );
    } else {
      await db.query(
        'UPDATE trending_notes SET name=?, link=?, description=?, category=? WHERE id=?',
        [name, link || null, description, cat, id]
      );
    }
    res.json({ message: 'Note updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE note ──────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM trending_notes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;