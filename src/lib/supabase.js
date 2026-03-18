import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Upload image helper
export async function uploadImage(file, bucket = 'listing-photos') {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `${fileName}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file)

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return publicUrl
}

// Upload video helper
export async function uploadVideo(file) {
  return uploadImage(file, 'listing-videos')
}

// Get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

// Get listings with filters
export async function getListings(filters = {}) {
  let query = supabase
    .from('listings')
    .select(`
      *,
      user:users(id, display_name, user_type, is_verified),
      category:categories(name, slug, icon)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (filters.category) {
    query = query.eq('category_id', filters.category)
  }

  if (filters.minPrice) {
    query = query.gte('price', filters.minPrice)
  }

  if (filters.maxPrice) {
    query = query.lte('price', filters.maxPrice)
  }

  // Filtro piratas — solo anuncios ghost
  if (filters.isPirate) {
    query = query.eq('is_ghost', true)
  }

  if (filters.search) {
    query = query.textSearch('title', filters.search)
  }

  const { data, error } = await query
  if (error) throw error

  // Filtrar por tipo de vendedor en cliente
  // Supabase no soporta filtrar por columnas de joins directamente
  if (filters.sellerTypes && filters.sellerTypes.length > 0) {
    return data.filter(listing =>
      !listing.is_ghost &&
      filters.sellerTypes.includes(listing.user?.user_type)
    )
  }

  return data
}

// Get single listing by slug
export async function getListingBySlug(slug) {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      user:users(id, display_name, user_type, is_verified, avatar_url, created_at),
      category:categories(name, slug, icon)
    `)
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data
}

// Increment listing views
export async function incrementViews(listingId) {
  const { error } = await supabase.rpc('increment_listing_views', {
    listing_uuid: listingId
  })
  if (error) console.error('Error incrementing views:', error)
}

// Increment listing contacts
export async function incrementContacts(listingId) {
  const { error } = await supabase.rpc('increment_listing_contacts', {
    listing_uuid: listingId
  })
  if (error) console.error('Error incrementing contacts:', error)
}

// Get categories
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

// Increment listing shares
export async function incrementShares(listingId) {
  const { error } = await supabase.rpc('increment_listing_shares', {
    listing_uuid: listingId
  })
  if (error) console.error('Error incrementing shares:', error)
}
