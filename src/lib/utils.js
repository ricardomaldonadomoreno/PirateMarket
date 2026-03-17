// Format price with currency
export function formatPrice(price, currency = 'BOB') {
  return `${currency} ${Number(price).toLocaleString('es-BO')}`
}

// Calculate relative time
export function timeAgo(date, t) {
  const now = new Date()
  const diff = now - new Date(date)
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${t('time.ago')} ${days} ${t('time.days')}`
  if (hours > 0) return `${t('time.ago')} ${hours} ${t('time.hours')}`
  if (minutes > 0) return `${t('time.ago')} ${minutes} ${t('time.minutes')}`
  return t('time.now')
}

// Calculate time until expiry (for pirate listings)
export function timeUntilExpiry(expiresAt, t) {
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diff = expiry - now
  
  if (diff <= 0) return t('listing.detail.expired')
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}${t('time.days')} ${hours % 24}${t('time.hours')}`
  return `${hours}${t('time.hours')}`
}

// Validate image file
export function validateImage(file) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  if (!validTypes.includes(file.type)) {
    return 'Solo se permiten imágenes JPG, PNG o WebP'
  }
  
  if (file.size > maxSize) {
    return 'La imagen no puede superar 5MB'
  }
  
  return null
}

// Validate video file
export function validateVideo(file) {
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime']
  const maxSize = 20 * 1024 * 1024 // 20MB
  const maxDuration = 6 // seconds
  
  if (!validTypes.includes(file.type)) {
    return 'Solo se permiten videos MP4, WebM o MOV'
  }
  
  if (file.size > maxSize) {
    return 'El video no puede superar 20MB'
  }
  
  return null
}

// Generate WhatsApp URL
export function generateWhatsAppURL(phone, listingTitle, listingSlug) {
  const baseUrl = window.location.origin
  const message = `Hola, vi tu anuncio en Pirata Market:\n${listingTitle}\n${baseUrl}/ficha/${listingSlug}`
  
  const cleanPhone = phone.replace(/\D/g, '')
  
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

// Generate share URL
export function generateShareURL(slug) {
  return `${window.location.origin}/ficha/${slug}`
}

// Copy to clipboard
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    return false
  }
}

// Get user badge info
export function getUserBadge(userType, isVerified, t) {
  if (userType === 'shop') {
    return { 
      icon: '🏪', 
      label: t('badges.shop'),
      color: 'warning'
    }
  }
  if (userType === 'wholesale') {
    return { 
      icon: '📦', 
      label: t('badges.wholesale'),
      color: 'warning'
    }
  }
  if (isVerified) {
    return { 
      icon: '✓', 
      label: t('badges.verified'),
      color: 'success'
    }
  }
  return { 
    icon: '👤', 
    label: t('badges.pirate'),
    color: 'gold'
  }
}

// Validate WhatsApp number
export function validateWhatsApp(phone) {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 10 && cleaned.length <= 15
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return distance.toFixed(1) // Return in km with 1 decimal
}

function toRad(degrees) {
  return degrees * (Math.PI / 180)
}

// Format distance for display
export function formatDistance(km, t) {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km} km`
}

// Open location in maps (Google Maps or Apple Maps)
export function openInMaps(lat, lng) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  
  if (isIOS) {
    // Apple Maps
    window.open(`https://maps.apple.com/?q=${lat},${lng}`, '_blank')
  } else {
    // Google Maps
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
  }
}

// Debounce function for search
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Check if user is on mobile
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// Get device type for maps
export function getDeviceType() {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

// Compress image before upload
export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            }))
          },
          'image/jpeg',
          quality
        )
      }
      
      img.onerror = reject
    }
    
    reader.onerror = reject
  })
}
```
