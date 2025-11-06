import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { spacing, typography } from "@/utils/theme";
import { getEmailError, getPasswordError } from "@/utils/validators";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Define colors directly to match theme structure
const colors = {
  background: "#1A202C",
  surface: "#2D3748",
  surfaceElevated: "#374151",
  primary: "#FF6B35",
  primaryHover: "#E55A2B",
  primaryLight: "#B84E25",
  accent: "#FFD93D",
  accentHover: "#E6C335",
  textPrimary: "#ffffff",
  textSecondary: "#cbd5e0",
  textTertiary: "#a0aec0",
  success: "#06d6a0",
  warning: "#ff9f1c",
  error: "#ef476f",
  border: "#4a5568",
  borderLight: "#2d3748",
};

export default function SignUpScreen() {
  const router = useRouter();
  const { signInWithPassword, signInWithGoogle, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Redirect to main app if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, authLoading, router]);

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    const emailErr = getEmailError(email);
    const passwordErr = getPasswordError(password);
    let confirmPasswordErr: string | null = null;

    if (password !== confirmPassword) {
      confirmPasswordErr = "Passwords do not match";
    }

    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPasswordErr);

    return !emailErr && !passwordErr && !confirmPasswordErr;
  };

  /**
   * Handle sign-up button press
   */
  const handleSignUp = async () => {
    // Clear previous errors
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Sign up uses the same sign-in function (Convex Auth handles account creation)
      await signInWithPassword(email, password);

      // Show success message
      Alert.alert("Account Created!", "Welcome to iTimedIT.");

      router.replace("/(tabs)");
    } catch (error: any) {
      // Show error message
      Alert.alert(
        "Sign Up Failed",
        error.message || "Please try again."
      );
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

  /**
   * Handle confirm password input change
   */
  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (confirmPasswordError) {
      setConfirmPasswordError(null);
    }
  };

  /**
   * Handle Google sign-up button press
   */
  const handleGoogleSignUp = async () => {
    try {
      setIsGoogleLoading(true);

      // Call Google sign-in function (also creates account if new)
      await signInWithGoogle();

      // Only show success message if we're actually authenticated
      if (isAuthenticated) {
        Alert.alert("Welcome!", "You have successfully signed up with Google.");
      }
    } catch (error: any) {
      // Only show error alert for actual errors (not cancellation)
      if (error.message && !error.message.includes("cancel")) {
        Alert.alert(
          "Google Sign Up Failed",
          error.message || "Please try again."
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  /**
   * Navigate to sign-in screen
   */
  const handleSignInPress = () => {
    router.push("/auth/sign-in");
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
            <Text style={styles.title}>Get Started</Text>
            <Text style={styles.subtitle}>Create an account to start tracking your time</Text>
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
            placeholder="Choose a strong password"
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
                <MaterialCommunityIcons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            }
          />

          {/* Confirm Password Input */}
          <Input
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={handleConfirmPasswordChange}
            error={confirmPasswordError || undefined}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            }
          />

          {/* Sign Up Button */}
          <Button
            variant="primary"
            onPress={handleSignUp}
            disabled={isSubmitting || isGoogleLoading}
            loading={isSubmitting}
            style={styles.signUpButton}
          >
            Create Account
          </Button>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign Up */}
          <Button
            variant="outline"
            onPress={handleGoogleSignUp}
            disabled={isSubmitting || isGoogleLoading}
            loading={isGoogleLoading}
            style={styles.googleButton}
          >
            Continue with Google
          </Button>

          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleSignInPress}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    signUpButton: {
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
      marginBottom: spacing.lg,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: spacing.md,
    },
    footerText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    signInLink: {
      ...typography.body,
      color: colors.primary,
      fontWeight: "600",
    },
  });
