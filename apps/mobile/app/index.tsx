import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useAuthActions } from "@convex-dev/auth/react";

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { signOut } = useAuthActions();

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  // Signed in state
  if (user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

        <View style={styles.header}>
          <Text style={styles.title}>✅ Signed In Successfully!</Text>
          <Text style={styles.subtitle}>Welcome, {user.name || user.email}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={() => signOut()}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Signed out state - show auth options
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      <View style={styles.header}>
        <Text style={styles.title}>iTimedIT</Text>
        <Text style={styles.subtitle}>Simple Time Tracking</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push("/auth/sign-up")}
        >
          <Text style={styles.primaryButtonText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push("/auth/sign-in")}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#9ca3af",
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 400,
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
  },
  primaryButton: {
    backgroundColor: "#FF6B35",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  dangerButton: {
    backgroundColor: "#ef4444",
    marginTop: 20,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#FF6B35",
    fontSize: 18,
    fontWeight: "600",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
});
