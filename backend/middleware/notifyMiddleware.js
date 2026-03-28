const pool = require('../db');

const ROUTE_MAP = {
  '/api/findings': { noun: 'Finding',            type: 'finding'  },
  '/api/projects': { noun: 'Project',            type: 'project'  },
  '/api/users':    { noun: 'User',               type: 'user'     },
  '/api/wof':      { noun: 'Wall of Fame entry', type: 'general'  },
  '/api/trending': { noun: 'Note',               type: 'general'  },
};

const VERB_MAP = {
  POST:   'added',
  PUT:    'updated',
  PATCH:  'updated',
  DELETE: 'deleted',
};

function notifyMiddleware(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  if (req.originalUrl.startsWith('/api/notifications')) return next();
  if (req.originalUrl.startsWith('/api/auth')) return next();

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const cleanPath  = req.originalUrl.split('?')[0];
      const matched    = Object.keys(ROUTE_MAP).find(k => cleanPath.startsWith(k));
      if (!matched) return originalJson(body);

      const label      = ROUTE_MAP[matched];
      const verb       = VERB_MAP[req.method];

      // Who performed the action
      const actor      = req.user?.name || req.user?.email || 'Someone';

      // What entity was affected — from response body OR request body
      const entityName =
        body?.name       || body?.title       ||
        body?.data?.name || body?.data?.title ||
        req.body?.name   || req.body?.title   || null;

      // Build human-readable strings
      const title = entityName
        ? `${label.noun} "${entityName}" ${verb}`
        : `${label.noun} ${verb}`;

      const message = entityName
        ? `${actor} ${verb} ${label.noun.toLowerCase()} "${entityName}"`
        : `${actor} ${verb} a ${label.noun.toLowerCase()}`;

      const userId = req.user?.id || null;

      pool.execute(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [userId, title, message, label.type]
      ).catch(err => console.error('[Notify] Insert failed:', err.message));
    }

    return originalJson(body);
  };

  next();
}

module.exports = notifyMiddleware;