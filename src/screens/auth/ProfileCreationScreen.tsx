// src/screens/auth/ProfileCreationScreen.tsx

import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  StyleSheet 
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';

type ProfileCreationScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ProfileCreation'
>;

const ProfileCreationScreen: React.FC = () => {
  const { user, createProfile } = useContext(AuthContext);
  const navigation = useNavigation<ProfileCreationScreenNavigationProp>();

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleCreateProfile = async () => {
    if (!firstName || !lastName) {
      Alert.alert('Validation Error', 'Please enter both first and last names.');
      return;
    }

    setLoading(true);
    try {
      if (user) {
        await createProfile(user, firstName, lastName);
        navigation.replace('Home'); // Navigate to the main app screen
      } else {
        Alert.alert('Error', 'User is not authenticated.');
      }
    } catch (error: any) {
      // Error handling is already done in createProfile
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Profile</Text>

      <TextInput 
        style={styles.input} 
        placeholder="First Name" 
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
        textContentType="givenName"
      />

      <TextInput 
        style={styles.input} 
        placeholder="Last Name" 
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
        textContentType="familyName"
      />

      <TouchableOpacity style={styles.button} onPress={handleCreateProfile} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Profile</Text>}
      </TouchableOpacity>
    </View>
  );
};

export default ProfileCreationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    height: 50,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
});