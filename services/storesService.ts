import { api } from './api'
import type { Store, ApiResponse } from '../types'

export const storesService = {
  async getStores(): Promise<Store[]> {
    const res = await api.get<ApiResponse<Store[]>>('/tiendas.php')
    return res.data.datos
  },
}
