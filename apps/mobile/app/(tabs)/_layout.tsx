import { Tabs } from "expo-router";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useTheme } from "@/utils/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View, TouchableOpacity, Linking } from "react-native";

export default function TabLayout() {
  const { colors } = useTheme();

  const handleReportPress = () => {
    Linking.openURL("https://itimedit.netlify.app/projects");
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.textPrimary,
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginRight: 12, paddingVertical: 4 }}>
            <TouchableOpacity
              onPress={handleReportPress}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: colors.surface,
              }}
              accessible={true}
              accessibilityLabel="Open projects in web browser"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="chart-bar" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <ThemeToggle />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Timer",
          tabBarLabel: "Timer",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="timer" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="entries"
        options={{
          title: "Entries",
          tabBarLabel: "Entries",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-list" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cog" color={color} size={size} />,
        }}
      />
      {/* Workspace tab removed - workspace switcher now in settings tab */}
      <Tabs.Screen
        name="workspace"
        options={{
          href: null, // Hide from tab bar but keep route available
        }}
      />
      {/* Projects tab removed - project creation now available inline from timer screen */}
      <Tabs.Screen
        name="projects"
        options={{
          href: null, // Hide from tab bar but keep route available
        }}
      />
    </Tabs>
  );
}
