// src/screens/auth/CheckEmailScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';

type CheckEmailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CheckEmail'
>;

const CheckEmailScreen: React.FC = () => {
  const navigation = useNavigation<CheckEmailScreenNavigationProp>();

  const handleResendEmail = async () => {
    // Implement resend email functionality if needed
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check Your Email</Text>
      <Text style={styles.message}>
        A verification link has been sent to your email. Please verify your email to continue.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('SignIn')}>
        <Text style={styles.buttonText}>I Verified My Email</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleResendEmail}>
        <Text style={styles.link}>Resend Verification Email</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CheckEmailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#555',
  },
  button: {
    height: 50,
    width: '80%',
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
  link: {
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
  },
});