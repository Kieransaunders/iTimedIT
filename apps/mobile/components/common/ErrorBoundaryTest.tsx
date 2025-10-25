import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

/**
 * Test component to verify error boundaries are working correctly
 * This component intentionally throws errors to test error handling
 *
 * WARNING: Only use this in development for testing!
 */
export function ErrorBoundaryTest() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    // This will be caught by the error boundary
    throw new Error("Test error from ErrorBoundaryTest component");
  }

  if (!__DEV__) {
    // Don't render in production
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Error Boundary Test</Text>
      <Text style={styles.warning}>⚠️ Development Only</Text>

      <TouchableOpacity
        style={styles.errorButton}
        onPress={() => setShouldError(true)}
      >
        <Text style={styles.buttonText}>Trigger Test Error</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.asyncErrorButton}
        onPress={() => {
          // Test async error
          setTimeout(() => {
            throw new Error("Async test error");
          }, 100);
        }}
      >
        <Text style={styles.buttonText}>Trigger Async Error</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.promiseErrorButton}
        onPress={() => {
          // Test promise rejection
          Promise.reject(new Error("Promise rejection test"));
        }}
      >
        <Text style={styles.buttonText}>Trigger Promise Rejection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    right: 10,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "red",
    zIndex: 9999,
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
    color: "red",
  },
  warning: {
    fontSize: 10,
    marginBottom: 10,
    color: "orange",
  },
  errorButton: {
    backgroundColor: "red",
    padding: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  asyncErrorButton: {
    backgroundColor: "orange",
    padding: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  promiseErrorButton: {
    backgroundColor: "purple",
    padding: 8,
    borderRadius: 4,
  },
  buttonText: {
    color: "white",
    fontSize: 11,
    textAlign: "center",
  },
});