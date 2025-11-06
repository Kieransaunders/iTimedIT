import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ListRenderItemInfo,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import PagerView from "react-native-pager-view";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LucideIcon } from "lucide-react-native";
import { Project } from "@/types/models";
import { ProjectCard } from "./ProjectCard";
import { borderRadius, spacing, typography } from "@/utils/theme";
import { useTheme } from "@/utils/ThemeContext";
import { softTap } from "@/utils/haptics";

const PAGINATION_DOT_SIZE = 10; // Larger dots
const PAGINATION_DOT_GAP = 8; // More space between dots

export interface ProjectCarouselProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  onQuickStart?: (project: Project) => void;
  onToggleFavorite?: (projectId: string) => Promise<void>;
  isFavorite?: (projectId: string) => boolean;
  sectionTitle: string;
  sectionIcon?: LucideIcon;
  todaysTimeByProject?: Map<string, number>;
  onAddPress?: () => void;
  isTimerRunning?: boolean;
}

/**
 * ProjectCarousel component with horizontal scrolling, pagination dots,
 * edge fade gradients, and collapsible section
 */
export const ProjectCarousel = React.memo<ProjectCarouselProps>(
  ({ projects, selectedProject, onSelectProject, onQuickStart, onToggleFavorite, isFavorite, sectionTitle, sectionIcon: SectionIcon, todaysTimeByProject, onAddPress, isTimerRunning = false }) => {
    const { colors, theme } = useTheme();
    const styles = createStyles(colors);
    const isLightMode = theme === "light";

    // Create rounded/curved gradient colors for light mode
    const getGradientColors = (direction: "left" | "right"): readonly [string, string, ...string[]] => {
      if (!isLightMode) {
        // Dark mode: simple linear gradient using background color
        return direction === "left"
          ? [colors.background, "transparent"] as const
          : ["transparent", colors.background] as const;
      }

      // Light mode: multi-stop curved gradient using surface color (white cards)
      // This creates cleaner fade matching the card color
      // Convert hex to rgba for opacity control
      const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };

      const baseColor = colors.surface; // Use surface (white) in light mode
      if (direction === "left") {
        return [
          baseColor,                      // Solid at edge
          hexToRgba(baseColor, 0.7),      // 70% opacity
          hexToRgba(baseColor, 0.3),      // 30% opacity
          "transparent"                    // Fully transparent
        ] as const;
      } else {
        return [
          "transparent",                   // Fully transparent
          hexToRgba(baseColor, 0.3),      // 30% opacity
          hexToRgba(baseColor, 0.7),      // 70% opacity
          baseColor                        // Solid at edge
        ] as const;
      }
    };

    // Collapsible state
    const [isCollapsed, setIsCollapsed] = useState(true);
    const chevronRotation = useSharedValue(-90);

    // Pagination state
    const [currentIndex, setCurrentIndex] = useState(0);
    const pagerRef = useRef<PagerView>(null);

    // Handle collapse toggle
    const toggleCollapse = useCallback(() => {
      setIsCollapsed((prev) => {
        const newValue = !prev;
        chevronRotation.value = withTiming(newValue ? -90 : 0, { duration: 300 });
        return newValue;
      });
      softTap();
    }, [chevronRotation]);

    // Animated chevron style
    const chevronStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${chevronRotation.value}deg` }],
    }));

    // Handle page selection (replaces handleScroll)
    const handlePageSelected = useCallback(
      (e: any) => {
        setCurrentIndex(e.nativeEvent.position);
      },
      []
    );

    // Memoize pagination dots
    const paginationDots = useMemo(() => {
      if (projects.length <= 1) return null;

      return (
        <View style={styles.paginationContainer}>
          {projects.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor: isActive ? colors.primary : colors.border,
                    width: isActive ? PAGINATION_DOT_SIZE * 2 : PAGINATION_DOT_SIZE,
                    opacity: isActive ? 1 : 0.5, // Dim inactive dots
                  },
                ]}
              />
            );
          })}
        </View>
      );
    }, [projects.length, currentIndex, colors, styles]);

    // Empty state
    if (projects.length === 0) {
      return null;
    }

    return (
      <View style={styles.container}>
        {/* Section Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.header}
            onPress={toggleCollapse}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel={`${sectionTitle} section`}
            accessibilityHint={`${isCollapsed ? "Expand" : "Collapse"} to ${isCollapsed ? "show" : "hide"} projects`}
            accessibilityRole="button"
          >
            <View style={styles.headerLeft}>
              {SectionIcon && <SectionIcon size={20} color={colors.textSecondary} />}
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{sectionTitle}</Text>
            </View>
            <Animated.View style={chevronStyle}>
              <MaterialCommunityIcons
                name="chevron-down"
                size={24}
                color={colors.textSecondary}
              />
            </Animated.View>
          </TouchableOpacity>

          {/* Add Button - subtle ghost style */}
          {onAddPress && (
            <TouchableOpacity
              onPress={() => {
                softTap();
                onAddPress();
              }}
              style={styles.addButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Add new project"
              accessibilityHint="Opens menu to create a new project"
            >
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Carousel Content */}
        {!isCollapsed && (
          <View style={styles.carouselWrapper}>
            {/* Left Edge Gradient */}
            {currentIndex > 0 && (
              <LinearGradient
                colors={getGradientColors("left")}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.edgeGradient,
                  styles.edgeGradientLeft,
                  {
                    width: isLightMode ? 30 : 40,
                  }
                ]}
                pointerEvents="none"
              />
            )}

            {/* PagerView Carousel */}
            <PagerView
              ref={pagerRef}
              style={styles.pagerView}
              initialPage={0}
              onPageSelected={handlePageSelected}
              overdrag={true}
              accessible={true}
              accessibilityLabel={`${sectionTitle} carousel`}
            >
              {projects.map((project, index) => {
                const isSelected = selectedProject?._id === project._id;
                const todaysSeconds = todaysTimeByProject?.get(project._id) || 0;

                return (
                  <View key={project._id} style={styles.pageContainer}>
                    <ProjectCard
                      project={project}
                      isActive={isSelected}
                      onPress={onSelectProject}
                      onQuickStart={onQuickStart}
                      onToggleFavorite={onToggleFavorite}
                      isFavorite={isFavorite ? isFavorite(project._id) : false}
                      todaysTime={todaysSeconds}
                      isTimerRunning={isTimerRunning}
                    />
                  </View>
                );
              })}
            </PagerView>

            {/* Right Edge Gradient */}
            {currentIndex < projects.length - 1 && (
              <LinearGradient
                colors={getGradientColors("right")}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.edgeGradient,
                  styles.edgeGradientRight,
                  {
                    width: isLightMode ? 30 : 40,
                  }
                ]}
                pointerEvents="none"
              />
            )}
          </View>
        )}

        {/* Pagination Dots */}
        {!isCollapsed && paginationDots}
      </View>
    );
  }
);

ProjectCarousel.displayName = "ProjectCarousel";

/**
 * Create styles with theme colors
 */
const createStyles = (colors: typeof import("@/utils/theme").lightColors) =>
  StyleSheet.create({
    container: {
      marginBottom: spacing.lg,
    },
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
    },
    header: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    addButton: {
      marginLeft: spacing.sm,
      padding: spacing.xs,
      borderRadius: borderRadius.sm,
      backgroundColor: "transparent",
    },
    sectionTitle: {
      ...typography.heading,
      fontSize: 18,
      fontWeight: "600",
    },
    carouselWrapper: {
      position: "relative",
      height: 160, // Updated to accommodate new card height (150px + some breathing room)
    },
    pagerView: {
      flex: 1,
      height: 160,
    },
    pageContainer: {
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
    },
    edgeGradient: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: 40,
      zIndex: 1,
    },
    edgeGradientLeft: {
      left: 0,
    },
    edgeGradientRight: {
      right: 0,
    },
    paginationContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: PAGINATION_DOT_GAP,
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    paginationDot: {
      height: PAGINATION_DOT_SIZE,
      borderRadius: PAGINATION_DOT_SIZE / 2,
    },
  });
