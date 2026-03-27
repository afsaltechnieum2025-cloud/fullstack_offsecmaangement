import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Search, FolderOpen, User, AlertTriangle } from 'lucide-react';
import { NOTIFY_EVENT } from '@/utils/notifyRefresh';

const API = (import.meta.env.VITE_API_URL as string)?.replace(/\/$/, '')
         || 'http://localhost:5000/api';

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Lucide icon components instead of emoji ──────────────────
const TYPE_CONFIG: Record<string, {
  IconComponent: React.ElementType;
  bg: string;
  iconColor: string;
  dot: string;
}> = {
  finding: {
    IconComponent: Search,
    bg: 'rgba(239,68,68,0.08)',
    iconColor: '#ef4444',
    dot: '#ef4444',
  },
  project: {
    IconComponent: FolderOpen,
    bg: 'rgba(59,130,246,0.08)',
    iconColor: '#3b82f6',
    dot: '#3b82f6',
  },
  user: {
    IconComponent: User,
    bg: 'rgba(249,115,22,0.1)',
    iconColor: '#f97316',   // ← Technieum primary orange
    dot: '#f97316',
  },
  general: {
    IconComponent: Bell,
    bg: 'rgba(249,115,22,0.06)',
    iconColor: '#f97316',
    dot: '#f97316',
  },
};

const DEFAULT_CFG = TYPE_CONFIG.general;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen]                   = useState(false);
  const dropdownRef                       = useRef<HTMLDivElement>(null);
  const token                             = localStorage.getItem('token');
  const unreadCount                       = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/notifications`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setNotifications(data);
    } catch (err) {
      console.error('[Notify] fetch error:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    window.addEventListener(NOTIFY_EVENT, fetchNotifications);
    return () => window.removeEventListener(NOTIFY_EVENT, fetchNotifications);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    const opening = !open;
    setOpen(opening);
    if (opening && unreadCount > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      await fetch(`${API}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>

      {/* ── Bell Button ── */}
      <button
        onClick={handleOpen}
        style={{
          position: 'relative',
          padding: '8px',
          borderRadius: '10px',
          background: open ? 'rgba(249,115,22,0.12)' : 'transparent',
          border: open ? '1px solid rgba(249,115,22,0.3)' : '1px solid transparent',
          cursor: 'pointer',
          color: open ? '#f97316' : '#9ca3af',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            minWidth: '18px',
            height: '18px',
            padding: '0 4px',
            fontSize: '10px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            color: '#fff',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 2px #0a0a14',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 8px)',
          width: '380px',
          background: '#0d0d1a',
          border: '1px solid rgba(249,115,22,0.2)',
          borderRadius: '14px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(249,115,22,0.05)',
          zIndex: 9999,
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(249,115,22,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '3px', height: '16px',
                background: 'linear-gradient(180deg, #f97316, #ef4444)',
                borderRadius: '2px',
              }} />
              <Bell size={14} color="#f97316" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                Notifications
              </span>
              <span style={{
                fontSize: '10px',
                color: '#6b7280',
                background: 'rgba(255,255,255,0.06)',
                padding: '1px 6px',
                borderRadius: '999px',
              }}>
                {notifications.length}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCheck size={12} color="#22c55e" />
              <span style={{ fontSize: '11px', color: '#22c55e' }}>All read</span>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '48px 16px', color: '#4b5563',
              }}>
                <Bell size={36} style={{ opacity: 0.2, marginBottom: '12px' }} />
                <p style={{ fontSize: '13px', margin: 0 }}>No notifications yet</p>
                <p style={{ fontSize: '11px', margin: '4px 0 0', opacity: 0.6 }}>
                  Actions you take will appear here
                </p>
              </div>
            ) : (
              notifications.map((n, i) => {
                const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CFG;
                const { IconComponent } = cfg;
                return (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px 16px',
                      borderBottom: i < notifications.length - 1
                        ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: !n.is_read ? 'rgba(249,115,22,0.04)' : 'transparent',
                      transition: 'background 0.15s',
                      cursor: 'default',
                    }}
                  >
                    {/* ── Lucide Icon Badge ── */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: cfg.bg,
                      border: `1px solid ${cfg.iconColor}33`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <IconComponent size={15} color={cfg.iconColor} />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <p style={{
                          margin: 0,
                          fontSize: '13px',
                          fontWeight: !n.is_read ? 600 : 400,
                          color: !n.is_read ? '#ffffff' : '#d1d5db',
                          lineHeight: 1.3,
                        }}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <div style={{
                            width: '7px', height: '7px',
                            borderRadius: '50%',
                            background: cfg.dot,
                            flexShrink: 0,
                            marginTop: '4px',
                            marginLeft: '8px',
                            boxShadow: `0 0 6px ${cfg.dot}`,
                          }} />
                        )}
                      </div>
                      <p style={{
                        margin: '3px 0 0',
                        fontSize: '11px',
                        color: '#6b7280',
                        lineHeight: 1.4,
                      }}>
                        {n.message}
                      </p>
                      <p style={{
                        margin: '4px 0 0',
                        fontSize: '10px',
                        color: '#374151',
                      }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(249,115,22,0.03)',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '11px', color: '#4b5563' }}>
                Showing last {notifications.length} notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}