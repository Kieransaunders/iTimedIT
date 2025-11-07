import { TextStyle, ViewStyle } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Icon } from "@/components/Icon"
import { translate } from "@/i18n/translate"
import { TimerScreen } from "@/screens/TimerScreen"
import { ProjectsScreen } from "@/screens/ProjectsScreen"
import { ClientsScreen } from "@/screens/ClientsScreen"
import { SettingsScreen } from "@/screens/SettingsScreen"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import type { MainTabParamList } from "./navigationTypes"

const Tab = createBottomTabNavigator<MainTabParamList>()

/**
 * This is the main navigator for the app with a bottom tab bar.
 * Each tab is a different screen in the app.
 *
 * More info: https://reactnavigation.org/docs/bottom-tab-navigator/
 * @returns {JSX.Element} The rendered `MainNavigator`.
 */
export function MainNavigator() {
  const { bottom } = useSafeAreaInsets()
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: themed([$tabBar, { height: bottom + 70 }]),
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tintInactive,
        tabBarLabelStyle: themed($tabBarLabel),
        tabBarItemStyle: themed($tabBarItem),
      }}
    >
      <Tab.Screen
        name="Timer"
        component={TimerScreen}
        options={{
          tabBarLabel: translate("mainNavigator:timerTab"),
          tabBarIcon: ({ focused }) => (
            <Icon icon="clock" color={focused ? colors.tint : colors.tintInactive} size={30} />
          ),
        }}
      />

      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{
          tabBarLabel: translate("mainNavigator:projectsTab"),
          tabBarIcon: ({ focused }) => (
            <Icon icon="components" color={focused ? colors.tint : colors.tintInactive} size={30} />
          ),
        }}
      />

      <Tab.Screen
        name="Clients"
        component={ClientsScreen}
        options={{
          tabBarLabel: translate("mainNavigator:clientsTab"),
          tabBarIcon: ({ focused }) => (
            <Icon icon="community" color={focused ? colors.tint : colors.tintInactive} size={30} />
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: translate("mainNavigator:settingsTab"),
          tabBarIcon: ({ focused }) => (
            <Icon icon="settings" color={focused ? colors.tint : colors.tintInactive} size={30} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

const $tabBar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderTopColor: colors.transparent,
})

const $tabBarItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingTop: spacing.md,
})

const $tabBarLabel: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 12,
  fontFamily: typography.primary.medium,
  lineHeight: 16,
  color: colors.text,
})
