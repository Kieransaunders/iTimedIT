import { Alert, View, ViewStyle } from "react-native"
import { useMMKVString } from "react-native-mmkv"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { Radio } from "@/components/Toggle/Radio"
import { useAuth } from "@/utils/useAuth"
import { useAppTheme } from "@/theme/context"
import { storage } from "@/utils/storage"
import type { ThemedStyle, ThemeContextModeT } from "@/theme/types"

/**
 * SettingsScreen - App settings and user preferences
 * @returns {JSX.Element} The rendered `SettingsScreen`.
 */
export function SettingsScreen() {
  const { themed, setThemeContextOverride } = useAppTheme()
  const { signOut, user } = useAuth()
  const [themePreference] = useMMKVString("ignite.themeScheme", storage)

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
          <Text preset="subheading" text="Appearance" style={themed($sectionTitle)} />

          <Radio
            label="Light"
            value={themePreference === "light"}
            onValueChange={() => setThemeContextOverride("light")}
            containerStyle={themed($radioContainer)}
          />

          <Radio
            label="Dark"
            value={themePreference === "dark"}
            onValueChange={() => setThemeContextOverride("dark")}
            containerStyle={themed($radioContainer)}
          />

          <Radio
            label="System (Auto)"
            value={themePreference === undefined}
            onValueChange={() => setThemeContextOverride(undefined)}
            containerStyle={themed($radioContainer)}
          />
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
  gap: spacing.md,
})

const $sectionTitle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
})

const $radioContainer: ThemedStyle<ViewStyle> = () => ({
  marginBottom: 0,
})

const $signOutSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xxl,
})
