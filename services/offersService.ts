import { api } from './api'
import type { Offer, ApiResponse, FilterState } from '../types'

export const offersService = {
  async getFeatured(): Promise<Offer[]> {
    const res = await api.get<ApiResponse<Offer[]>>('/destacadas.php')
    return res.data.datos
  },

  async getOffers(filters?: Partial<FilterState>, page = 1): Promise<{ offers: Offer[], total: number }> {
    const params: Record<string, string | number> = { pagina: page, solo_ofertas: 1 }
    if (filters?.stores?.length)       params.tienda        = filters.stores.join(',')
    if (filters?.categories?.length)   params.categoria     = filters.categories.join(',')
    if (filters?.minDiscount)          params.min_descuento = filters.minDiscount
    if (filters?.canton && filters.canton !== 'all') params.canton = filters.canton
    if (filters?.sortBy)               params.orden         = filters.sortBy
    const res = await api.get<ApiResponse<Offer[]>>('/ofertas.php', { params })
    return { offers: res.data.datos, total: res.data.total ?? 0 }
  },

  async search(q: string): Promise<{ tienda: { slug: string; nombre: string }, ofertas: Offer[] }[]> {
    const res = await api.get('/buscar.php', { params: { q, lang: 'de' } })
    return res.data.datos
  },
}
