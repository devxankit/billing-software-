import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Shield } from 'lucide-react'
import TranslatedText from './TranslatedText'

export default function BannerSlider({ banners, getTranslatedText }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isSwiping, setIsSwiping] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!banners || banners.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, 5000) // Change every 5 seconds

    return () => clearInterval(interval)
  }, [banners])

  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setIsSwiping(false)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
    if (touchStart && Math.abs(e.targetTouches[0].clientX - touchStart) > 10) {
      setIsSwiping(true)
    }
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    } else if (isRightSwipe) {
      setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1))
    }
    setTimeout(() => setIsSwiping(false), 50)
  }

  if (!banners || banners.length === 0) return null

  const banner = banners[currentIndex]

  const handleBannerClick = (e) => {
    if (isSwiping) return
    e?.stopPropagation()

    const link = banner.link?.trim()
    if (link && link !== '#') {
      if (link.startsWith('http://') || link.startsWith('https://')) {
        window.open(link, '_blank', 'noopener,noreferrer')
      } else if (link.startsWith('/')) {
        navigate(link)
      } else {
        navigate('/' + link)
      }
      return
    }

    // Smart fallback if link is not explicitly configured
    const lowerTitle = (banner.title || '').toLowerCase()
    const lowerSub = (banner.subtitle || '').toLowerCase()

    if (lowerTitle.includes('insurance') || lowerSub.includes('insurance')) {
      navigate('/insurance')
    } else if (lowerTitle.includes('trip') || lowerSub.includes('trip')) {
      navigate('/transport/trips')
    } else if (lowerTitle.includes('vehicle') || lowerSub.includes('vehicle')) {
      navigate('/transport/vehicles')
    } else if (lowerTitle.includes('bill') || lowerSub.includes('bill')) {
      navigate('/bills/create')
    } else if (lowerSub.includes('transbilling.in') || lowerSub.includes('transbiling.in')) {
      window.open('https://www.transbilling.in', '_blank', 'noopener,noreferrer')
    } else if (lowerTitle.includes('ad') || lowerSub.includes('ad')) {
      navigate('/support')
    } else {
      navigate('/insurance')
    }
  }

  return (
    <div style={{ marginBottom: 20, position: 'relative' }}>
      <div 
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleBannerClick}
        className="animate-fadeIn"
        style={{ 
          background: '#FFFFFF', borderRadius: 28, padding: '28px 32px', color: '#0F172A',
          position: 'relative', overflow: 'hidden', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: 180, display: 'flex', alignItems: 'center', border: '1px solid #F1F5F9'
        }}
      >
        {/* Full Background Image */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 0 }}>
          {banner.imageUrl ? (
            <img src={banner.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} alt="Banner" />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to right, #4F46E5, #7C3AED)' }} />
          )}
        </div>

        {/* Dark Overlay for Text Visibility */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 100%)', zIndex: 1 }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, flex: 1, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#FFFFFF', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              <TranslatedText>{banner.title}</TranslatedText>
            </h2>
            {banner.badge && (
              <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#F59E0B', color: 'white', padding: '3px 12px', borderRadius: 100, textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                <TranslatedText>{banner.badge}</TranslatedText>
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.92)', margin: 0, maxWidth: '85%', fontWeight: 500, lineHeight: 1.4, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            <TranslatedText>{banner.subtitle}</TranslatedText>
          </p>

          {/* Clickable Get Started Button */}
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={handleBannerClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#FFFFFF',
                color: '#0F172A',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 100,
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.35)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.25)'
              }}
            >
              <span>{getTranslatedText ? getTranslatedText(banner.buttonText || 'Get Started') : (banner.buttonText || 'Get Started')}</span>
              <ArrowRight size={15} color="#0F172A" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Indicators */}
      {banners.length > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
          {banners.map((_, idx) => (
            <div 
              key={idx}
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex(idx)
              }}
              style={{ 
                width: idx === currentIndex ? 24 : 8, 
                height: 8, 
                borderRadius: 4, 
                background: idx === currentIndex ? '#7C3AED' : '#CBD5E1',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
