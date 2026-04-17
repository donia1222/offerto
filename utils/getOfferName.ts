import type { Offer } from '../types'
import type { AppLang } from '../store/settingsStore'

export function getOfferName(offer: Offer, lang: AppLang): string {
  switch (lang) {
    case 'fr': return offer.nombre_fr || offer.nombre
    case 'it': return offer.nombre_it || offer.nombre_fr || offer.nombre
    case 'en': return offer.nombre  // EN fallback: DE name (closest to EN for Swiss products)
    default:   return offer.nombre
  }
}
