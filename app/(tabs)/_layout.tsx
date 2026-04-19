import { Tabs } from 'expo-router'
import { Platform, View, StyleSheet, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { useTranslation } from 'react-i18next'
import { Colors } from '../../constants/colors'
import { useListStore } from '../../store/listStore'
import { useNotificationsStore } from '../../store/notificationsStore'
import { useSettingsStore } from '../../store/settingsStore'

const TAB_HEIGHT = Platform.OS === 'ios' ? 82 : 64
const TAB_BOTTOM = 0
const TAB_SIDE   = 0

function BellTabIcon({ focused }: { focused: boolean }) {
  const count = useNotificationsStore(s => s.watchlist.length)
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={24} color={focused ? '#fff' : Colors.textLight} />
      {count > 0 && (
        <View style={styles.bellBadge}>
          <Text style={styles.cartBadgeText}>{count > 99 ? '99' : count}</Text>
        </View>
      )}
    </View>
  )
}

function CartTabIcon({ focused }: { focused: boolean }) {
  const count = useListStore(s => s.items.length)
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={focused ? '#fff' : Colors.textLight} />
      {count > 0 && (
        <View style={styles.cartBadge}>
          <Text style={styles.cartBadgeText}>{count > 99 ? '99' : count}</Text>
        </View>
      )}
    </View>
  )
}

function TabIcon({ name, focused, label, size = 22 }: {
  name: React.ComponentProps<typeof Ionicons>['name']
  focused: boolean
  label: string
  size?: number
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={size} color={focused ? '#fff' : Colors.textLight} />
    </View>
  )
}

export default function TabLayout() {
  const { t } = useTranslation()
  const cardLayout = useSettingsStore(s => s.cardLayout)

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarShowLabel:         false,
        tabBarStyle: {
          position:        'absolute',
          bottom:          TAB_BOTTOM,
          left:            TAB_SIDE,
          right:           TAB_SIDE,
          height:          TAB_HEIGHT,
          borderRadius:    0,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : Colors.surface,
          borderTopWidth:  0,
          elevation:       0,
          shadowColor:     '#000',
          shadowOpacity:   0.08,
          shadowRadius:    12,
          shadowOffset:    { width: 0, height: -4 },
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={85}
              tint="systemChromeMaterial"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border }]} />
          ),
        tabBarItemStyle: {
          height:        TAB_HEIGHT,
          paddingTop:    14,
          paddingBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="search"
        options={{
          href: null, // descomentar para ocultar Entdecken del tab bar
          tabBarIcon: ({ focused }) => (
            <TabIcon name="compass" focused={focused} label="Entdecken" size={28} />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={cardLayout === 'grid' ? (focused ? 'grid' : 'grid-outline') : (focused ? 'list' : 'list-outline')}
              focused={focused}
              label={t('tabs.home')}
              size={cardLayout === 'grid' ? 22 : 26}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="kataloge"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'newspaper' : 'newspaper-outline'} focused={focused} label={t('tabs.kataloge')} />
          ),
        }}
      />

      <Tabs.Screen
        name="list"
        options={{
          tabBarIcon: ({ focused }) => <CartTabIcon focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => <BellTabIcon focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} label={t('settings.title')} size={24} />
          ),
        }}
      />
      <Tabs.Screen name="stores" options={{ href: null }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  iconWrap: {
    width:           44,
    height:          44,
    borderRadius:    22,
    alignItems:      'center',
    justifyContent:  'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.primary,
  },
  cartBadge: {
    position: 'absolute', top: 1, right: 1,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#E2001A',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadge: {
    position: 'absolute', top: 1, right: 1,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: { fontSize: 9, fontFamily: 'Inter-Medium', color: '#fff', lineHeight: 12 },
})
