import { useState, useEffect } from 'react'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import './MiCuenta.css'

export default function MiCuentaResenas({ user }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadReviews()
  }, [user])

  const loadReviews = async () => {
    const { data } = await supabase
      .from('traficante_reviews')
      .select('*, reviewer:reviewer_id(display_name, avatar_url)')
      .eq('reviewed_id', user.id)
      .order('created_at', { ascending: false })
    setReviews(data || [])
    setLoading(false)
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  if (loading) return (
    <div className="mc-section">
      <div className="mc-loading">
        <div className="loading" style={{ width: 40, height: 40 }} />
      </div>
    </div>
  )

  return (
    <div className="mc-section">
      <div className="mc-section-header">
        <h2>Mis reseñas</h2>
        <p>Lo que dicen quienes han usado tu servicio.</p>
      </div>

      {reviews.length === 0 ? (
        <div className="mc-empty">
          <div className="mc-empty-icon">No hay reseñas</div>
          <p>Aún no tienes reseñas. Completa tu primer envío para comenzar a construir tu reputación.</p>
        </div>
      ) : (
        <>
          <div className="mc-rating-summary">
            <div className="mc-rating-big">{avgRating}</div>
            <div className="mc-rating-stars">{'⭐'.repeat(Math.round(avgRating))}</div>
            <div className="mc-rating-count">{reviews.length} reseñas</div>
          </div>
          <div className="mc-reviews-list">
            {reviews.map(review => (
              <div key={review.id} className="mc-review-card card">
                <div className="mc-review-header">
                  <div className="mc-review-avatar">
                    {review.reviewer?.avatar_url
                      ? <img src={review.reviewer.avatar_url} alt="" />
                      : <div>{review.reviewer?.display_name?.charAt(0) || '?'}</div>
                    }
                  </div>
                  <div>
                    <div className="mc-review-name">{review.reviewer?.display_name || 'Usuario'}</div>
                    <div className="mc-review-role">{review.reviewer_role}</div>
                  </div>
                  <div className="mc-review-stars">{'⭐'.repeat(review.rating)}</div>
                </div>
                {review.comment && <p className="mc-review-comment">{review.comment}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
