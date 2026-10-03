import React from 'react'
import { Bell, Shield, Info, AlertCircle, CheckCircle, Trash2, Clock } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import TranslatedText from '../../components/TranslatedText'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export default function NotificationList() {
  const { notifications, markRead, removeNotification, loading } = useNotifications()
  const { getTranslatedText } = usePageTranslation([
    'Notifications', 'Updates about your business activity', 'Mark all as read',
    'Loading notifications...', 'All caught up!', 'No new notifications right now.'
  ])
  const accentColor = '#7C3AED'

  const getIcon = (type) => {
    switch (type) {
      case 'alert':    return <AlertCircle size={20} color="#DC2626" />
      case 'security': return <Shield size={20} color="#EF4444" />
      case 'success':  return <CheckCircle size={20} color="#16A34A" />
      case 'info':     return <Info size={20} color="#2563EB" />
      default:         return <Bell size={20} color={accentColor} />
    }
  }

  return (
    <div className="animate-fadeIn page-wrapper" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
           <h2 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0F0D2E', margin: 0 }}>{getTranslatedText('Notifications')}</h2>
           <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>{getTranslatedText('Updates about your business activity')}</p>
        </div>
        <button 
          className="btn btn-ghost" 
          onClick={() => markRead('all')} 
          style={{ fontWeight: 700, borderRadius: 12, padding: '8px 16px', fontSize: '0.8rem' }}
          disabled={notifications.length === 0}
        >
          {getTranslatedText('Mark all as read')}
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #F1F5F9', overflow: 'hidden' }}>
        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            {getTranslatedText('Loading notifications...')}
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Bell size={32} color="#CBD5E1" />
            </div>
            <h3 style={{ fontWeight: 800, color: '#0F0D2E', marginBottom: 6 }}>{getTranslatedText('All caught up!')}</h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>{getTranslatedText('No new notifications right now.')}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {notifications.map(n => (
            <div 
              key={n._id} 
              onClick={() => !n.read && markRead(n._id)}
              style={{
                display: 'flex', gap: 14, padding: '16px 20px', borderBottom: '1px solid #F1F5F9',
                background: n.read ? 'transparent' : 'rgba(124, 58, 237, 0.03)',
                transition: '0.2s', position: 'relative', cursor: n.read ? 'default' : 'pointer'
              }}
            >
              {!n.read && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accentColor }} />}
              
              <div style={{ 
                width: 40, height: 40, borderRadius: 10, 
                background: 'white', border: '1px solid #F1F5F9',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {getIcon(n.type)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0F0D2E' }}><TranslatedText>{n.title}</TranslatedText></h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94A3B8', fontSize: '0.65rem', fontWeight: 600 }}>
                    <Clock size={10} /> {dayjs(n.createdAt).fromNow()}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: 1.4 }}><TranslatedText>{n.body}</TranslatedText></p>
              </div>

              <button 
                className="btn-icon" 
                onClick={(e) => { e.stopPropagation(); removeNotification(n._id); }}
                style={{ alignSelf: 'center', color: '#94A3B8', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
