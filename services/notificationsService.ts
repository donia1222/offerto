import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { api } from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
})

export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function registerToken(stores: string[], categories: string[], watchlist: string[]) {
  if (!Device.isDevice) return
  let token = ''
  let tokenError = ''
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? '15ed0244-e590-4bad-a905-2fd1231191b1'
    const result = await Notifications.getExpoPushTokenAsync({ projectId })
    token = result.data
  } catch (e: any) {
    tokenError = e?.message ?? String(e)
  }

  // Debug: verificar que el app llega al servidor
  await api.post('/debug_token.php', { token, tokenError, stores, categories, watchlist }).catch(() => {})

  if (!token) return
  await api.post('/register-token.php', {
    token,
    stores:     stores.join(','),
    categories: categories.join(','),
    watchlist:  watchlist.join(','),
  }).catch((e) => console.warn('[registerToken] API failed:', e))
}

export async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

export async function scheduleWeekly(title: string, body: string) {
  await Notifications.cancelScheduledNotificationAsync('weekly-offers')
  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-offers',
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2,
      hour: 7,
      minute: 0,
    },
  })
}

export async function cancelWeekly() {
  await Notifications.cancelScheduledNotificationAsync('weekly-offers')
}

export async function scheduleExpiringReminder(title: string, body: string) {
  await Notifications.cancelScheduledNotificationAsync('expiring-reminder')
  await Notifications.scheduleNotificationAsync({
    identifier: 'expiring-reminder',
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 19,
      minute: 0,
    },
  })
}

export async function cancelExpiringReminder() {
  await Notifications.cancelScheduledNotificationAsync('expiring-reminder')
}

export async function checkStores(
  stores: string[],
  notifTitle: string,
  notifBody: (stores: string[]) => string,
) {
  if (stores.length === 0) return
  try {
    const results = await Promise.all(
      stores.map(slug =>
        api.get('/ofertas.php', { params: { tienda: slug, limite: '1' } })
          .then(r => ({ slug, found: (r.data.total ?? 0) > 0 }))
          .catch(() => ({ slug, found: false }))
      )
    )
    const found = results.filter(r => r.found).map(r => r.slug)
    if (found.length === 0) return
    await Notifications.scheduleNotificationAsync({
      content: { title: notifTitle, body: notifBody(found), sound: true },
      trigger: null,
    })
  } catch {}
}

export async function checkWatchlist(
  terms: string[],
  notifTitle: string,
  notifBody: (matches: string[]) => string,
) {
  if (terms.length === 0) return
  try {
    const results = await Promise.all(
      terms.map(q =>
        api.get('/buscar.php', { params: { q, limite: '1' } })
          .then(r => ({ q, found: (r.data.datos?.length ?? 0) > 0 }))
          .catch(() => ({ q, found: false }))
      )
    )
    const matches = results.filter(r => r.found).map(r => r.q)
    if (matches.length === 0) return
    await Notifications.scheduleNotificationAsync({
      content: { title: notifTitle, body: notifBody(matches), sound: true },
      trigger: null,
    })
  } catch {}
}
