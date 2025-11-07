import { View, ViewStyle, FlatList, ActivityIndicator, TextStyle } from "react-native"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * ClientsScreen - Manage clients for time tracking
 * @returns {JSX.Element} The rendered `ClientsScreen`.
 */
export function ClientsScreen() {
  const { themed, theme } = useAppTheme()
  const { colors } = theme

  // Fetch clients from Convex
  const clients = useQuery(api.clients.list, {})

  if (clients === undefined) {
    return (
      <Screen preset="fixed" contentContainerStyle={themed($container)} safeAreaEdges={["top"]}>
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text text="Loading clients..." />
        </View>
      </Screen>
    )
  }

  if (clients.length === 0) {
    return (
      <Screen preset="scroll" contentContainerStyle={themed($container)} safeAreaEdges={["top"]}>
        <View style={themed($content)}>
          <Text preset="heading" text="Clients" />
          <View style={themed($emptyState)}>
            <Text text="No clients yet" style={themed($emptyText)} />
            <Text text="Clients will appear here once you create them" />
          </View>
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="fixed" contentContainerStyle={themed($container)} safeAreaEdges={["top"]}>
      <View style={themed($content)}>
        <Text preset="heading" text="Clients" style={themed($header)} />
        <FlatList
          data={clients}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <Card
              style={themed($clientCard)}
              ContentComponent={
                <View style={themed($clientContent)}>
                  <View style={themed($clientHeader)}>
                    {item.color && (
                      <View
                        style={[
                          themed($colorDot),
                          { backgroundColor: item.color },
                        ]}
                      />
                    )}
                    <Text preset="bold" text={item.name} />
                  </View>
                  {item.activeProjects !== undefined && (
                    <Text
                      text={`${item.activeProjects} active project${item.activeProjects !== 1 ? "s" : ""}`}
                      style={themed($projectCount)}
                    />
                  )}
                  {item.totalSeconds !== undefined && item.totalSeconds > 0 && (
                    <Text
                      text={`${Math.round(item.totalSeconds / 3600)} hours tracked`}
                      style={themed($hoursText)}
                    />
                  )}
                </View>
              }
            />
          )}
          contentContainerStyle={themed($listContent)}
        />
      </View>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xl,
  flex: 1,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
  flex: 1,
})

const $header: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
})

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: spacing.md,
})

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xxl,
  alignItems: "center",
  gap: spacing.sm,
})

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
  paddingBottom: spacing.lg,
})

const $clientCard: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
})

const $clientContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $clientHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
})

const $colorDot: ThemedStyle<ViewStyle> = () => ({
  width: 12,
  height: 12,
  borderRadius: 6,
})

const $projectCount: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
})

const $hoursText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 14,
})
