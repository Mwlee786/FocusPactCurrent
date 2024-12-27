// src/screens/auth/EmailVerificationScreen.tsx

import React, { useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackActions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

const EmailVerificationScreen: React.FC = () => {
  const { getSession } = useContext(AuthContext);
  const navigation = useNavigation();

  useEffect(() => {
    const handleEmailVerification = async (url: string | null) => {
      if (url) {
        const parsedUrl = Linking.parse(url);
        const access_token = parsedUrl.queryParams ? parsedUrl.queryParams['access_token'] : null;

        if (access_token && typeof access_token === 'string') {
          try {
            await getSession(access_token);
            Alert.alert('Success', 'Your email has been verified!');
            navigation.dispatch(StackActions.replace('App'));
          } catch (error) {
            console.error('Error setting session:', error);
            Alert.alert('Error', 'Failed to verify email.');
            navigation.dispatch(StackActions.replace('Auth'));
          }
        } else {
          Alert.alert('Error', 'Invalid verification link.');
          navigation.dispatch(StackActions.replace('Auth'));
        }
      } else {
        Alert.alert('Error', 'No verification link found.');
        navigation.dispatch(StackActions.replace('Auth'));
      }
    };

    // Handle the initial URL if the app was opened via the link
    Linking.getInitialURL().then((url) => {
      handleEmailVerification(url);
    });

    // Listen for incoming URLs while the app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleEmailVerification(url);
    });

    return () => {
      subscription.remove(); // Updated to correctly remove the listener
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.text}>Verifying your email...</Text>
    </View>
  );
};

export default EmailVerificationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    color: '#333',
  },
});