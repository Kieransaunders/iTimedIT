import React, { FC, useEffect, useState } from "react"
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
import { useAuth } from "@/utils/useAuth"
import { getEmailError, getPasswordError } from "@/utils/validators"

interface SignUpScreenProps extends NativeStackScreenProps<AppStackParamList, "SignUp"> {}

export const SignUpScreen: FC<SignUpScreenProps> = ({ navigation }) => {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { signInWithPassword, signInWithGoogle, isAuthenticated, isLoading: authLoading } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Redirect to main app if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigation.replace("Welcome")
    }
  }, [isAuthenticated, authLoading, navigation])

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    const emailErr = getEmailError(email)
    const passwordErr = getPasswordError(password)
    let confirmPasswordErr: string | null = null

    if (password !== confirmPassword) {
      confirmPasswordErr = "Passwords do not match"
    }

    setEmailError(emailErr)
    setPasswordError(passwordErr)
    setConfirmPasswordError(confirmPasswordErr)

    return !emailErr && !passwordErr && !confirmPasswordErr
  }

  /**
   * Handle sign-up button press
   */
  const handleSignUp = async () => {
    // Clear previous errors
    setEmailError(null)
    setPasswordError(null)
    setConfirmPasswordError(null)

    // Validate form
    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)

      // Sign up uses the same sign-in function (Convex Auth handles account creation)
      await signInWithPassword(email, password)

      // Show success message
      Toast.show({
        type: "success",
        text1: "Account Created!",
        text2: "Welcome to iTimedIT.",
      })

      navigation.replace("Welcome")
    } catch (error: any) {
      // Show error message
      Toast.show({
        type: "error",
        text1: "Sign Up Failed",
        text2: error.message || "Please try again.",
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
   * Handle confirm password input change
   */
  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text)
    if (confirmPasswordError) {
      setConfirmPasswordError(null)
    }
  }

  /**
   * Handle Google sign-up button press
   */
  const handleGoogleSignUp = async () => {
    try {
      setIsGoogleLoading(true)

      // Call Google sign-in function (also creates account if new)
      await signInWithGoogle()

      // Only show success message if we're actually authenticated
      if (isAuthenticated) {
        Toast.show({
          type: "success",
          text1: "Welcome!",
          text2: "You have successfully signed up with Google.",
        })
      }
    } catch (error: any) {
      // Only show error toast for actual errors (not cancellation)
      if (error.message && !error.message.includes("cancel")) {
        Toast.show({
          type: "error",
          text1: "Google Sign Up Failed",
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

  const ConfirmPasswordRightAccessory = () => (
    <PressableIcon
      icon={showConfirmPassword ? "view" : "hidden"}
      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
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
                Get Started
              </Text>
              <Text preset="subheading" style={$subtitle}>
                Create an account to start tracking your time
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
              placeholder="Choose a strong password"
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

            {/* Confirm Password Input */}
            <TextField
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              helper={confirmPasswordError || undefined}
              status={confirmPasswordError ? "error" : undefined}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              RightAccessory={ConfirmPasswordRightAccessory}
              containerStyle={$textField}
            />

            {/* Sign Up Button */}
            <Button
              preset="filled"
              onPress={handleSignUp}
              disabled={isSubmitting || isGoogleLoading}
              style={$signUpButton}
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>

            {/* Divider */}
            <View style={$divider}>
              <View style={[$dividerLine, { backgroundColor: colors.border }]} />
              <Text style={$dividerText}>or</Text>
              <View style={[$dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Google Sign Up */}
            <Button
              preset="default"
              onPress={handleGoogleSignUp}
              disabled={isSubmitting || isGoogleLoading}
              style={$googleButton}
            >
              {isGoogleLoading ? "Signing Up..." : "Continue with Google"}
            </Button>

            {/* Sign In Link */}
            <View style={$footer}>
              <Text style={$footerText}>Already have an account? </Text>
              <Text
                preset="bold"
                style={[$signInLink, { color: colors.tint }]}
                onPress={() => navigation.navigate("SignIn")}
              >
                Sign In
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

const $signUpButton: ViewStyle = {
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

const $signInLink: TextStyle = {}
