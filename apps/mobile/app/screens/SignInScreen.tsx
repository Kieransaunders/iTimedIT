import React, { FC, useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import Toast from "react-native-toast-message"

import { Button } from "@/components/Button"
import { PressableIcon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { AppStackParamList } from "@/navigators"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import { useAuth } from "@/utils/useAuth"
import { getEmailError, getPasswordError } from "@/utils/validators"

interface SignInScreenProps extends NativeStackScreenProps<AppStackParamList, "SignIn"> {}

export const SignInScreen: FC<SignInScreenProps> = ({ navigation }) => {
  const { theme } = useAppTheme()
  const { colors, spacing } = theme
  const { signInWithPassword, signInWithGoogle, isAuthenticated, isLoading: authLoading } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    const emailErr = getEmailError(email)
    const passwordErr = getPasswordError(password)

    setEmailError(emailErr)
    setPasswordError(passwordErr)

    return !emailErr && !passwordErr
  }

  /**
   * Handle sign-in button press
   */
  const handleSignIn = async () => {
    // Clear previous errors
    setEmailError(null)
    setPasswordError(null)

    // Validate form
    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)

      // Call sign-in function
      await signInWithPassword(email, password)

      // Show success message
      Toast.show({
        type: "success",
        text1: "Welcome back!",
        text2: "You have successfully signed in.",
      })

      // Navigation will happen automatically via conditional routing in AppNavigator
    } catch (error: any) {
      // Show error message
      Toast.show({
        type: "error",
        text1: "Sign In Failed",
        text2: error.message || "Please check your credentials and try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Handle email input change
   */
  const handleEmailChange = (text: string) => {
    setEmail(text)
    if (emailError) {
      setEmailError(null)
    }
  }

  /**
   * Handle password input change
   */
  const handlePasswordChange = (text: string) => {
    setPassword(text)
    if (passwordError) {
      setPasswordError(null)
    }
  }

  /**
   * Handle Google sign-in button press
   */
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)

      // Call Google sign-in function
      await signInWithGoogle()

      // Only show success message if we're actually authenticated
      // (signInWithGoogle returns early on cancel without throwing)
      if (isAuthenticated) {
        Toast.show({
          type: "success",
          text1: "Welcome!",
          text2: "You have successfully signed in with Google.",
        })
      }
    } catch (error: any) {
      // Only show error toast for actual errors (not cancellation)
      if (error.message && !error.message.includes("cancel")) {
        Toast.show({
          type: "error",
          text1: "Google Sign In Failed",
          text2: error.message || "Please try again.",
        })
      }
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const PasswordRightAccessory = () => (
    <PressableIcon
      icon={showPassword ? "view" : "hidden"}
      onPress={() => setShowPassword(!showPassword)}
      containerStyle={$iconContainer}
    />
  )

  return (
    <Screen preset="auto" contentContainerStyle={$screenContentContainer} safeAreaEdges={["top"]}>
      <KeyboardAvoidingView
        style={$container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={$scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={$content}>
            {/* Header */}
            <View style={$header}>
              <Text preset="heading" style={$title}>
                Welcome Back
              </Text>
              <Text preset="subheading" style={$subtitle}>
                Sign in to continue tracking your time
              </Text>
            </View>

            {/* Email Input */}
            <TextField
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={handleEmailChange}
              helper={emailError || undefined}
              status={emailError ? "error" : undefined}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              containerStyle={$textField}
            />

            {/* Password Input */}
            <TextField
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={handlePasswordChange}
              helper={passwordError || undefined}
              status={passwordError ? "error" : undefined}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              RightAccessory={PasswordRightAccessory}
              containerStyle={$textField}
            />

            {/* Sign In Button */}
            <Button
              preset="filled"
              onPress={handleSignIn}
              disabled={isSubmitting || isGoogleLoading}
              style={$signInButton}
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </Button>

            {/* Divider */}
            <View style={$divider}>
              <View style={[$dividerLine, { backgroundColor: colors.border }]} />
              <Text style={$dividerText}>or</Text>
              <View style={[$dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Google Sign In */}
            <Button
              preset="default"
              onPress={handleGoogleSignIn}
              disabled={isSubmitting || isGoogleLoading}
              style={$googleButton}
            >
              {isGoogleLoading ? "Signing In..." : "Continue with Google"}
            </Button>

            {/* Sign Up Link */}
            <View style={$footer}>
              <Text style={$footerText}>Don't have an account? </Text>
              <Text
                preset="bold"
                style={[$signUpLink, { color: colors.tint }]}
                onPress={() => navigation.navigate("SignUp")}
              >
                Sign Up
              </Text>
            </View>
          </View>
        </ScrollView>
        <Toast />
      </KeyboardAvoidingView>
    </Screen>
  )
}

const $screenContentContainer: ViewStyle = {
  flex: 1,
}

const $container: ViewStyle = {
  flex: 1,
}

const $scrollContent: ViewStyle = {
  flexGrow: 1,
  justifyContent: "center",
}

const $content: ViewStyle = {
  paddingHorizontal: 24,
  paddingVertical: 24,
  maxWidth: 500,
  width: "100%",
  alignSelf: "center",
}

const $header: ViewStyle = {
  marginBottom: 32,
}

const $title: TextStyle = {
  marginBottom: 8,
}

const $subtitle: TextStyle = {}

const $textField: ViewStyle = {
  marginBottom: 16,
}

const $iconContainer: ViewStyle = {
  marginEnd: 12,
}

const $signInButton: ViewStyle = {
  marginTop: 8,
  marginBottom: 24,
}

const $divider: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginVertical: 24,
}

const $dividerLine: ViewStyle = {
  flex: 1,
  height: 1,
}

const $dividerText: TextStyle = {
  marginHorizontal: 16,
}

const $googleButton: ViewStyle = {
  marginBottom: 24,
}

const $footer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  marginTop: 16,
}

const $footerText: TextStyle = {}

const $signUpLink: TextStyle = {}
