import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { colors, spacing, typography } from "@/utils/theme";
import { getEmailError, getPasswordError } from "@/utils/validators";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle, signInAnonymously, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAnonymousLoading, setIsAnonymousLoading] = useState(false);

  // Redirect to main app if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace("/");
    }
  }, [isAuthenticated, authLoading, router]);

  /**
   * Validate form fields
   * @returns true if form is valid, false otherwise
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
      await signIn(email, password);

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
    // Clear error when user starts typing
    if (emailError) {
      setEmailError(null);
    }
  };

  /**
   * Handle password input change
   */
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    // Clear error when user starts typing
    if (passwordError) {
      setPasswordError(null);
    }
  };

  /**
   * Handle Google sign-in button press
   */
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);

      // Call Google sign-in function
      await signInWithGoogle();

      // Show success message
      Toast.show({
        type: "success",
        text1: "Welcome!",
        text2: "You have successfully signed in with Google.",
      });

      // Don't manually redirect - let the useEffect handle it
      // This ensures user data is loaded before navigation
    } catch (error: any) {
      // Show error message
      Toast.show({
        type: "error",
        text1: "Google Sign In Failed",
        text2: error.message || "Please try again.",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  /**
   * Handle anonymous sign-in button press
   */
  const handleAnonymousSignIn = async () => {
    try {
      setIsAnonymousLoading(true);

      // Call anonymous sign-in function
      await signInAnonymously();

      // Show success message
      Toast.show({
        type: "success",
        text1: "Welcome!",
        text2: "Explore the app as a guest.",
      });

      // Don't manually redirect - let the useEffect handle it
      // This ensures user data is loaded before navigation
    } catch (error: any) {
      // Show error message
      Toast.show({
        type: "error",
        text1: "Sign In Failed",
        text2: error.message || "Please try again.",
      });
    } finally {
      setIsAnonymousLoading(false);
    }
  };

  // Show loading spinner while checking auth status
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to iTimedIT</Text>
            <Text style={styles.subtitle}>
              Sign in to track your time and manage projects
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={handleEmailChange}
              error={emailError || undefined}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!isSubmitting}
              accessibilityLabel="Email input"
              accessibilityHint="Enter your email address"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={handlePasswordChange}
              error={passwordError || undefined}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              editable={!isSubmitting}
              accessibilityLabel="Password input"
              accessibilityHint="Enter your password"
            />

            <Button
              onPress={handleSignIn}
              loading={isSubmitting}
              disabled={isSubmitting || isGoogleLoading || isAnonymousLoading}
              fullWidth
              style={styles.signInButton}
              accessibilityLabel="Sign in button"
              accessibilityHint="Tap to sign in with your credentials"
            >
              Sign In
            </Button>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            {/* Google Sign-In Button - Disabled for mobile (requires OAuth flow setup) */}
            {/* TODO: Implement Google OAuth with Expo AuthSession */}
            {/* <Button
              onPress={handleGoogleSignIn}
              loading={isGoogleLoading}
              disabled={isSubmitting || isGoogleLoading || isAnonymousLoading}
              fullWidth
              variant="outline"
              style={styles.googleButton}
              accessibilityLabel="Sign in with Google button"
              accessibilityHint="Tap to sign in with your Google account"
            >
              {!isGoogleLoading && "Sign in with Google"}
            </Button> */}

            {/* Anonymous Sign-In Button */}
            <Button
              onPress={handleAnonymousSignIn}
              loading={isAnonymousLoading}
              disabled={isSubmitting || isGoogleLoading || isAnonymousLoading}
              fullWidth
              variant="ghost"
              style={styles.tryAppButton}
              accessibilityLabel="Try app button"
              accessibilityHint="Tap to explore the app as a guest without signing in"
            >
              {!isAnonymousLoading && "Try App"}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xxl,
    alignItems: "center",
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  signInButton: {
    marginTop: spacing.md,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  divider: {
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
    marginBottom: spacing.sm,
  },
  tryAppButton: {
    marginBottom: spacing.md,
  },
});
