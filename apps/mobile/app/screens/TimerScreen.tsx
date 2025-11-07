import { View, ViewStyle } from "react-native"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * TimerScreen - Main screen for time tracking
 * @returns {JSX.Element} The rendered `TimerScreen`.
 */
export function TimerScreen() {
  const { themed } = useAppTheme()

  return (
    <Screen preset="scroll" contentContainerStyle={themed($container)} safeAreaEdges={["top"]}>
      <View style={themed($content)}>
        <Text preset="heading" text="Timer" />
        <Text text="Timer functionality will go here" />
      </View>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xl,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
})
