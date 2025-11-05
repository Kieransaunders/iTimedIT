import { View, Text } from "react-native";
import { useTheme } from "@/utils/ThemeContext";

export default function ProjectsScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
      <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
        Projects screen (hidden from tabs)
      </Text>
    </View>
  );
}
