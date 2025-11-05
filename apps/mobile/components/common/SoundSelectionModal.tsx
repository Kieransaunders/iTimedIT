import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  soundManager,
  BUILT_IN_SOUNDS,
  CustomSound,
  playTestSound,
} from '../../services/soundManager';

interface SoundSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  currentSound: string;
  onSelect: (soundId: string) => void;
  title: string;
}

export default function SoundSelectionModal({
  visible,
  onClose,
  currentSound,
  onSelect,
  title,
}: SoundSelectionModalProps) {
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCustomSounds();
    }
  }, [visible]);

  const loadCustomSounds = () => {
    setCustomSounds(soundManager.getCustomSounds());
  };

  const handlePlaySound = async (soundId: string) => {
    setPlayingSound(soundId);
    try {
      await playTestSound(soundId);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
    // Auto-stop playing indicator after 2 seconds
    setTimeout(() => {
      setPlayingSound(null);
    }, 2000);
  };

  const handleSelectSound = (soundId: string) => {
    onSelect(soundId);
    onClose();
  };

  const handleUploadSound = async () => {
    try {
      setIsUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setIsUploading(false);
        return;
      }

      const file = result.assets[0];

      // Prompt for a name
      Alert.prompt(
        'Name Your Sound',
        'Enter a name for this custom sound:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsUploading(false),
          },
          {
            text: 'Save',
            onPress: async (name?: string) => {
              if (!name || name.trim() === '') {
                Alert.alert('Error', 'Please enter a valid name');
                setIsUploading(false);
                return;
              }

              try {
                await soundManager.addCustomSound(file.uri, name.trim());
                loadCustomSounds();
                Alert.alert('Success', 'Custom sound added successfully!');
              } catch (error) {
                console.error('Failed to add custom sound:', error);
                Alert.alert('Error', 'Failed to add custom sound. Please try again.');
              }
              setIsUploading(false);
            },
          },
        ],
        'plain-text'
      );
    } catch (error) {
      console.error('Failed to upload sound:', error);
      Alert.alert('Error', 'Failed to upload sound file');
      setIsUploading(false);
    }
  };

  const handleDeleteCustomSound = (sound: CustomSound) => {
    Alert.alert(
      'Delete Sound',
      `Are you sure you want to delete "${sound.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await soundManager.deleteCustomSound(sound.id);
              loadCustomSounds();
            } catch (error) {
              console.error('Failed to delete sound:', error);
              Alert.alert('Error', 'Failed to delete sound');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Built-in Sounds Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Built-in Sounds</Text>
            {BUILT_IN_SOUNDS.map((sound) => (
              <View key={sound.id} style={styles.soundItem}>
                <View style={styles.soundInfo}>
                  <Text style={styles.soundName}>{sound.name}</Text>
                </View>
                <View style={styles.soundActions}>
                  <TouchableOpacity
                    onPress={() => handlePlaySound(sound.id)}
                    style={[
                      styles.actionButton,
                      playingSound === sound.id && styles.playingButton,
                    ]}
                  >
                    <Ionicons
                      name={playingSound === sound.id ? 'pause' : 'play'}
                      size={20}
                      color="#007AFF"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleSelectSound(sound.id)}
                    style={[
                      styles.selectButton,
                      currentSound === sound.id && styles.selectedButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectButtonText,
                        currentSound === sound.id && styles.selectedButtonText,
                      ]}
                    >
                      {currentSound === sound.id ? 'Selected' : 'Select'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Custom Sounds Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Custom Sounds</Text>
              <TouchableOpacity
                onPress={handleUploadSound}
                style={styles.uploadButton}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {customSounds.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes-outline" size={48} color="#CCC" />
                <Text style={styles.emptyStateText}>No custom sounds yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Upload your own MP3 files to personalize your alerts
                </Text>
              </View>
            ) : (
              customSounds.map((sound) => (
                <View key={sound.id} style={styles.soundItem}>
                  <View style={styles.soundInfo}>
                    <Text style={styles.soundName}>{sound.name}</Text>
                    <Text style={styles.customLabel}>Custom</Text>
                  </View>
                  <View style={styles.soundActions}>
                    <TouchableOpacity
                      onPress={() => handlePlaySound(sound.id)}
                      style={[
                        styles.actionButton,
                        playingSound === sound.id && styles.playingButton,
                      ]}
                    >
                      <Ionicons
                        name={playingSound === sound.id ? 'pause' : 'play'}
                        size={20}
                        color="#007AFF"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleSelectSound(sound.id)}
                      style={[
                        styles.selectButton,
                        currentSound === sound.id && styles.selectedButton,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          currentSound === sound.id && styles.selectedButtonText,
                        ]}
                      >
                        {currentSound === sound.id ? 'Selected' : 'Select'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCustomSound(sound)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  soundInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  soundName: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  customLabel: {
    fontSize: 11,
    color: '#007AFF',
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  soundActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  playingButton: {
    backgroundColor: '#E5F1FF',
  },
  selectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
  },
  selectedButton: {
    backgroundColor: '#007AFF',
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  selectedButtonText: {
    color: '#FFF',
  },
  deleteButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
