// src/screens/auth/SignUpScreen.tsx

import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../services/supabase/supabaseClient';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

type RootStackParamList = {
  SignUp: undefined;
  SignIn: undefined;
  CheckEmail: undefined;
  Home: undefined;
};

type SignUpScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SignUp'
>;

const SignUpScreen: React.FC = () => {
  const { signUp } = useContext(AuthContext);
  const navigation = useNavigation<SignUpScreenNavigationProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  React.useEffect(() => {
    GoogleSignin.configure({
      iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  const handleSignUp = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signUp({ email, password });
      navigation.navigate('CheckEmail');
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up');
      Alert.alert('Sign Up Error', err.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Sign out from Google
      await GoogleSignin.signOut();
      // Sign out from Supabase
      await supabase.auth.signOut();
      // Optionally, you can also revoke access
      await GoogleSignin.revokeAccess();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      // Sign out first to ensure clean state
      await handleSignOut();
      
      setGoogleLoading(true);
      
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      // Get both access token and ID token
      const { accessToken, idToken } = await GoogleSignin.getTokens();
      
      if (!accessToken || !idToken) {
        throw new Error('Failed to get Google tokens');
      }

      // Sign in with Supabase using both tokens
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
        access_token: accessToken,
      });

      if (authError) throw authError;
      console.log('Successfully signed up with Google:', authData);

      if (authData?.user) {
        console.log('User data:', authData.user);
        // The user is already authenticated with Supabase, no need to call signUp again
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        throw new Error('No user data received from Google sign up');
      }
      
    } catch (error: any) {
      console.error('Error signing up with Google:', error);
      Alert.alert('Google Sign Up Error', error.message || 'An error occurred during Google sign up');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput 
        style={styles.input} 
        placeholder="Email" 
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.googleButton]} 
        onPress={handleGoogleSignUp}
        disabled={googleLoading}
      >
        <View style={styles.googleButtonContent}>
          {googleLoading ? (
            <ActivityIndicator color="#4285F4" />
          ) : (
            <>
              <Image 
                source={require('../../assets/google-icon.png')}
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
        <Text style={styles.link}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    height: 50,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  orText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: '#2196F3',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  error: {
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default SignUpScreen;