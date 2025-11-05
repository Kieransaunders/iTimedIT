import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { spacing, typography } from "@/utils/theme";
import { useTheme } from "@/utils/ThemeContext";
import { getEmailError, getPasswordError } from "@/utils/validators";
import { useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signInWithPassword, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to main app if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace("/");
    }
  }, [isAuthenticated, authLoading, router]);

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    const emailErr = getEmailError(email);
    const passwordErr = getPasswordError(password);

    setEmailError(emailErr);
    setPasswordError(passwordErr);

    return !emailErr && !passwordErr;
  };

  /**
   * Handle sign-in button press
   */
  const handleSignIn = async () => {
    // Clear previous errors
    setEmailError(null);
    setPasswordError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Call sign-in function
      await signInWithPassword(email, password);

      // Show success message
      Toast.show({
        type: "success",
        text1: "Welcome back!",
        text2: "You have successfully signed in.",
      });

      router.replace("/");
    } catch (error: any) {
      // Show error message
      Toast.show({
        type: "error",
        text1: "Sign In Failed",
        text2: error.message || "Please check your credentials and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle email input change
   */
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) {
      setEmailError(null);
    }
  };

  /**
   * Handle password input change
   */
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) {
      setPasswordError(null);
    }
  };

  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue tracking your time</Text>
          </View>

          {/* Email Input */}
          <Input
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChangeText={handleEmailChange}
            error={emailError || undefined}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
          />

          {/* Password Input */}
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={handlePasswordChange}
            error={passwordError || undefined}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            }
          />

          {/* Sign In Button */}
          <Button
            variant="primary"
            onPress={handleSignIn}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={styles.signInButton}
          >
            Sign In
          </Button>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In - Disabled for now */}
          <Button
            variant="outline"
            onPress={() => {
              Toast.show({
                type: "info",
                text1: "Coming Soon",
                text2: "Google sign-in will be available soon.",
              });
            }}
            disabled={true}
            style={styles.googleButton}
          >
            Continue with Google
          </Button>
        </View>
      </ScrollView>
      <Toast />
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: typeof import("@/utils/theme").lightColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      padding: spacing.lg,
    },
    content: {
      width: "100%",
      maxWidth: 400,
      alignSelf: "center",
    },
    header: {
      marginBottom: spacing.xl,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
    signInButton: {
      marginTop: spacing.md,
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      ...typography.caption,
      color: colors.textSecondary,
      marginHorizontal: spacing.md,
    },
    googleButton: {
      marginBottom: spacing.md,
    },
  });
