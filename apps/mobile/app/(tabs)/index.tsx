import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useTimer } from "../../hooks/useTimer";
import { useProjects } from "../../hooks/useProjects";
import type { Id } from "@/convex/_generated/dataModel";

export default function TimerScreen() {
  const { runningTimer, isRunning, start, stop, elapsedSeconds } = useTimer();
  const { projects, isLoading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleStartStop = async () => {
    if (isRunning) {
      await stop();
    } else if (selectedProjectId) {
      await start(selectedProjectId);
    }
  };

  const selectedProject = projects.find((p) => p._id === selectedProjectId);
  const currentProject = isRunning && runningTimer
    ? projects.find((p) => p._id === runningTimer.projectId)
    : selectedProject;

  if (projectsLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285f4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Timer Display */}
        <View style={styles.timerSection}>
          <Text style={styles.timerLabel}>
            {isRunning ? "Running" : "Ready to start"}
          </Text>
          <Text style={styles.timerDisplay}>{formatTime(elapsedSeconds)}</Text>
          {currentProject && (
            <Text style={styles.projectName}>{currentProject.name}</Text>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsSection}>
          <TouchableOpacity
            style={[
              styles.startButton,
              isRunning && styles.stopButton,
              !isRunning && !selectedProjectId && styles.buttonDisabled,
            ]}
            onPress={handleStartStop}
            disabled={!isRunning && !selectedProjectId}
          >
            <Text style={styles.startButtonText}>
              {isRunning ? "Stop" : "Start"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Project Selector */}
        {!isRunning && (
          <View style={styles.projectsSection}>
            <Text style={styles.sectionTitle}>Select Project</Text>
            {projects.length === 0 ? (
              <Text style={styles.emptyText}>
                No projects yet. Create one in the web app.
              </Text>
            ) : (
              projects.map((project) => (
                <TouchableOpacity
                  key={project._id}
                  style={[
                    styles.projectCard,
                    selectedProjectId === project._id && styles.projectCardSelected,
                  ]}
                  onPress={() => setSelectedProjectId(project._id)}
                >
                  <Text style={styles.projectCardName}>{project.name}</Text>
                  {project.clientName && (
                    <Text style={styles.projectCardClient}>{project.clientName}</Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  timerSection: {
    alignItems: "center",
    paddingVertical: 48,
  },
  timerLabel: {
    fontSize: 18,
    color: "#999",
    marginBottom: 16,
  },
  timerDisplay: {
    fontSize: 64,
    fontWeight: "bold",
    color: "#fff",
    fontVariant: ["tabular-nums"],
  },
  projectName: {
    fontSize: 24,
    color: "#4285f4",
    marginTop: 16,
  },
  controlsSection: {
    paddingVertical: 24,
  },
  startButton: {
    backgroundColor: "#4285f4",
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  stopButton: {
    backgroundColor: "#ea4335",
  },
  buttonDisabled: {
    backgroundColor: "#555",
    opacity: 0.5,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  projectsSection: {
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
  },
  emptyText: {
    color: "#999",
    fontSize: 16,
    textAlign: "center",
    paddingVertical: 32,
  },
  projectCard: {
    backgroundColor: "#2d2d44",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  projectCardSelected: {
    backgroundColor: "#4285f4",
  },
  projectCardName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  projectCardClient: {
    color: "#ccc",
    fontSize: 14,
    marginTop: 4,
  },
});
