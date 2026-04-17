import { Tabs } from 'expo-router'
import { Platform, View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { useTranslation } from 'react-i18next'
import { Colors } from '../../constants/colors'

const TAB_HEIGHT = Platform.OS === 'ios' ? 82 : 64
const TAB_BOTTOM = 0
const TAB_SIDE   = 0

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

  return (
    <Tabs
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
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="compass" focused={focused} label={t('tabs.home')} size={26} />
          ),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} label="Entdecken" />
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
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'cart' : 'cart-outline'} focused={focused} label="Liste" />
          ),
        }}
      />
      <Tabs.Screen name="stores"   options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
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
})
