import { Alert, View, ViewStyle } from "react-native"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { useAuth } from "@/utils/useAuth"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * SettingsScreen - App settings and user preferences
 * @returns {JSX.Element} The rendered `SettingsScreen`.
 */
export function SettingsScreen() {
  const { themed } = useAppTheme()
  const { signOut, user } = useAuth()

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut()
            } catch (error) {
              Alert.alert("Error", "Failed to sign out. Please try again.")
            }
          },
        },
      ],
      { cancelable: true },
    )
  }

  return (
    <Screen preset="scroll" contentContainerStyle={themed($container)} safeAreaEdges={["top"]}>
      <View style={themed($content)}>
        <Text preset="heading" text="Settings" />

        {user?.email && (
          <View style={themed($userInfo)}>
            <Text preset="subheading" text="Account" />
            <Text text={user.email} />
          </View>
        )}

        <View style={themed($section)}>
          <Text preset="subheading" text="General" />
          <Text text="App settings will go here" />
        </View>

        <View style={themed($signOutSection)}>
          <Button
            text="Sign Out"
            preset="default"
            onPress={handleSignOut}
          />
        </View>
      </View>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xl,
  paddingBottom: spacing.xl,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xl,
})

const $userInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $signOutSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xxl,
})
