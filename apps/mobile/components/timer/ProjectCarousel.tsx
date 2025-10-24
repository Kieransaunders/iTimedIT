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

const CARD_WIDTH = 280;
const CARD_GAP = 16;
const ITEM_WIDTH = CARD_WIDTH + CARD_GAP;
const PAGINATION_DOT_SIZE = 8;
const PAGINATION_DOT_GAP = 6;

export interface ProjectCarouselProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  onToggleFavorite?: (projectId: string) => void;
  onQuickStart?: (project: Project) => void;
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
  ({ projects, selectedProject, onSelectProject, onToggleFavorite, onQuickStart, isFavorite, sectionTitle, sectionIcon: SectionIcon, todaysTimeByProject, onAddPress, isTimerRunning = false }) => {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    // Collapsible state
    const [isCollapsed, setIsCollapsed] = useState(false);
    const chevronRotation = useSharedValue(0);

    // Pagination state
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList<Project>>(null);

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

    // Handle scroll to update pagination
    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / ITEM_WIDTH);
        setCurrentIndex(index);
      },
      []
    );

    // Render project card item
    const renderItem = useCallback(
      ({ item }: ListRenderItemInfo<Project>) => {
        const isSelected = selectedProject?._id === item._id;
        const todaysSeconds = todaysTimeByProject?.get(item._id) || 0;

        return (
          <ProjectCard
            project={item}
            isActive={isSelected}
            onPress={onSelectProject}
            onToggleFavorite={onToggleFavorite}
            onQuickStart={onQuickStart}
            isFavorite={isFavorite?.(item._id) ?? false}
            todaysTime={todaysSeconds}
            isTimerRunning={isTimerRunning}
          />
        );
      },
      [selectedProject, todaysTimeByProject, onSelectProject, onToggleFavorite, onQuickStart, isFavorite, isTimerRunning]
    );

    // Get item layout for performance
    const getItemLayout = useCallback(
      (_data: Project[] | null | undefined, index: number) => ({
        length: ITEM_WIDTH,
        offset: ITEM_WIDTH * index,
        index,
      }),
      []
    );

    // Key extractor
    const keyExtractor = useCallback((item: Project) => item._id, []);

    // Item separator component
    const ItemSeparatorComponent = useCallback(
      () => <View style={{ width: CARD_GAP }} />,
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
                    width: isActive ? PAGINATION_DOT_SIZE * 1.5 : PAGINATION_DOT_SIZE,
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
                colors={[colors.background, "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.edgeGradient, styles.edgeGradientLeft]}
                pointerEvents="none"
              />
            )}

            {/* FlatList Carousel */}
            <FlatList
              ref={flatListRef}
              data={projects}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              snapToInterval={ITEM_WIDTH}
              decelerationRate="fast"
              contentContainerStyle={styles.flatListContent}
              ItemSeparatorComponent={ItemSeparatorComponent}
              getItemLayout={getItemLayout}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onScrollToIndexFailed={(info) => {
                console.warn("Scroll to index failed:", info);
              }}
              accessible={true}
              accessibilityLabel={`${sectionTitle} carousel`}
            />

            {/* Right Edge Gradient */}
            {currentIndex < projects.length - 1 && (
              <LinearGradient
                colors={["transparent", colors.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.edgeGradient, styles.edgeGradientRight]}
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
      height: 160, // Adjust based on ProjectCard height
    },
    flatListContent: {
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
