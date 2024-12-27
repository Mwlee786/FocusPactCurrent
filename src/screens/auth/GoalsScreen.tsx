// src/screens/auth/GoalsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../services/supabase/supabaseClient';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

global.Buffer = Buffer;

const GoalsScreen: React.FC = () => {
  // State for "Why I'm Here" section
  const [isEditingWhy, setIsEditingWhy] = useState(false);
  const [whyText, setWhyText] = useState("I want to improve my focus and productivity.");

  // State for Journal Entry
  const [journalText, setJournalText] = useState('');
  const maxJournalLength = 280;

  // State for Media
  const [media, setMedia] = useState<string | null>(null);

  interface User {
    id: string;
    // Add other user properties as needed
  }

  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
  
    fetchUser();
  }, []);

  // Handle Editing "Why I'm Here"
  const handleEditWhy = () => {
    setIsEditingWhy(true);
  };

  const handleSaveWhy = () => {
    if (whyText.trim() === '') {
      Alert.alert('Validation Error', 'Why statement cannot be empty.');
      return;
    }
    // TODO: Save the whyText to backend or state
    setIsEditingWhy(false);
  };

  // Handle Adding Media
  const handleAddMedia = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Denied', 'Permission to access media library is required.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
      allowsEditing: true,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      setMedia(pickerResult.assets[0].uri);
    }
  };

  // Handle "Share to Feed"
  const handleShareToFeed = async () => {
    if (journalText.trim() === '') {
      Alert.alert('Validation Error', 'Please enter your accomplishment today.');
      return;
    }

    try {
      let mediaUrl = null;

      // If media is attached, upload it to Supabase Storage
      if (media) {
        // Generate a unique filename
        const filename = `${user?.id}/${Date.now()}_${media.split('/').pop()}`;

        // Fetch the image/video as a binary
        const fileInfo = await FileSystem.getInfoAsync(media);
        const file = await FileSystem.readAsStringAsync(media, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Determine content type based on file extension
        const fileExtension = filename.split('.').pop()?.toLowerCase();
        let contentType = 'image/jpeg'; // Default
        if (fileExtension === 'png') {
          contentType = 'image/png';
        } else if (['mp4', 'mov'].includes(fileExtension || '')) {
          contentType = 'video/mp4';
        }

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(filename, Buffer.from(file, 'base64'), {
            contentType: contentType,
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get the public URL
        const { data: publicUrlData } = supabase.storage.from('post-media').getPublicUrl(filename);

        const publicUrl = publicUrlData.publicUrl;

        if (!publicUrl) {
          throw new Error('Failed to get public URL');
        }

        mediaUrl = publicUrl;
      }

      // Insert the post into the `posts` table
      const { data: postData, error: insertError } = await supabase.from('posts').insert([
        {
          user_id: user?.id,
          why_text: whyText,
          accomplishment_text: journalText,
          media_url: mediaUrl,
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      Alert.alert('Success', 'Your post has been shared to the feed.');

      // Reset the form
      setJournalText('');
      setMedia(null);
    } catch (error: any) {
      console.error('Error sharing post:', error.message);
      Alert.alert('Error', 'Failed to share your post. Please try again.');
    }
  };

  // Handle "Save for Myself"
  const handleSaveForMyself = () => {
    Alert.alert('Feature Coming Soon', 'Save for Myself functionality will be available soon.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Section 1: Why I'm Here */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Why I'm Here</Text>
          {!isEditingWhy && (
            <TouchableOpacity onPress={handleEditWhy}>
              <Ionicons name="pencil" size={24} color="#4CAF50" />
            </TouchableOpacity>
          )}
        </View>
        {isEditingWhy ? (
          <View>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={4}
              value={whyText}
              onChangeText={setWhyText}
              placeholder="Enter your reason..."
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveWhy}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.sectionContent}>{whyText}</Text>
        )}
      </View>

      {/* Section 2: Daily Accomplishments */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>
          What did you accomplish today outside of screen time?
        </Text>
        <TextInput
          style={styles.journalInput}
          multiline
          numberOfLines={4}
          maxLength={maxJournalLength}
          value={journalText}
          onChangeText={setJournalText}
          placeholder="Write your journal entry..."
        />
        <Text style={styles.charCount}>{journalText.length}/{maxJournalLength}</Text>

        {/* Add Media */}
        <TouchableOpacity style={styles.mediaButton} onPress={handleAddMedia}>
          <Ionicons name="camera" size={24} color="#ffffff" />
          <Text style={styles.mediaButtonText}>Add Photo/Video</Text>
        </TouchableOpacity>
        {media && (
          <Image source={{ uri: media }} style={styles.mediaPreview} />
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareToFeed}>
            <Text style={styles.actionButtonText}>Share to Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButtonSmall} onPress={handleSaveForMyself}>
            <Text style={styles.actionButtonText}>Save for Myself Only</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default GoalsScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    flexGrow: 1,
  },
  sectionContainer: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    elevation: 2, // for Android
    shadowColor: '#000', // for iOS
    shadowOffset: { width: 0, height: 2 }, // for iOS
    shadowOpacity: 0.1, // for iOS
    shadowRadius: 4, // for iOS
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  sectionContent: {
    fontSize: 16,
    color: '#555555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  journalInput: {
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#888888',
    marginBottom: 12,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  mediaButtonText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 8,
  },
  mediaPreview: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginBottom: 12,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shareButton: {
    flex: 0.48,
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButtonSmall: {
    flex: 0.48,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});