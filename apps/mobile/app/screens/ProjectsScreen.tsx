import { View, ViewStyle, FlatList, ActivityIndicator, TextStyle } from "react-native"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * ProjectsScreen - Manage projects for time tracking
 * @returns {JSX.Element} The rendered `ProjectsScreen`.
 */
export function ProjectsScreen() {
  const { themed, theme } = useAppTheme()
  const { colors } = theme

  // Fetch projects from Convex
  const projects = useQuery(api.projects.listAll, {})

  if (projects === undefined) {
    return (
      <Screen preset="fixed" contentContainerStyle={themed($container)} safeAreaEdges={["top"]}>
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text text="Loading projects..." />
        </View>
      </Screen>
    )
  }

  if (projects.length === 0) {
    return (
      <Screen preset="scroll" contentContainerStyle={themed($container)} safeAreaEdges={["top"]}>
        <View style={themed($content)}>
          <Text preset="heading" text="Projects" />
          <View style={themed($emptyState)}>
            <Text text="No projects yet" style={themed($emptyText)} />
            <Text text="Projects will appear here once you create them" />
          </View>
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="fixed" contentContainerStyle={themed($container)} safeAreaEdges={["top"]}>
      <View style={themed($content)}>
        <Text preset="heading" text="Projects" style={themed($header)} />
        <FlatList
          data={projects}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <Card
              style={themed($projectCard)}
              ContentComponent={
                <View style={themed($projectContent)}>
                  <Text preset="bold" text={item.name} />
                  {item.client && <Text text={item.client.name} style={themed($clientText)} />}
                  {item.hourlyRate && (
                    <Text text={`$${item.hourlyRate}/hr`} style={themed($rateText)} />
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

const $projectCard: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
})

const $projectContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xxs,
})

const $clientText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
})

const $rateText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 14,
})
