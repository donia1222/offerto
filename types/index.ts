export interface Store {
  slug:    string
  nombre:  string
  logo:    string | null
  color:   string
}

export interface Category {
  slug: string
  icon: string
}

export interface Offer {
  id:              number
  tienda:          Store
  categoria:       Category | null
  nombre:          string
  nombre_fr:       string | null
  nombre_it:       string | null
  precio_original: number | null
  precio_oferta:   number
  descuento:       number
  unidad:          string | null
  imagen:          string | null
  valido_desde:    string
  valido_hasta:    string
  dias_restantes:  number
  canton:          string
  fuente_url:      string | null | undefined
}

export interface ShoppingListItem {
  id:       number
  ofertaId: number
  cantidad: number
  comprado: boolean
  oferta:   Offer
}

export interface ApiResponse<T> {
  status:  'ok' | 'error'
  total?:  number
  pagina?: number
  datos:   T
  message?: string
}

export interface FilterState {
  stores:      string[]
  categories:  string[]
  minDiscount: number
  canton:      string
  sortBy:      'discount' | 'date' | 'price'
}
