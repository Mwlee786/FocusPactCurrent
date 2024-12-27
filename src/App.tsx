// src/App.tsx

import React, { useContext, useEffect } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ActivityIndicator, View, StyleSheet, Linking } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EmailVerificationScreen from './screens/auth/EmailVerificationScreen';
import ProfileCreationScreen from './screens/auth/ProfileCreationScreen';
import AuthNavigation from './navigation/AuthNavigation';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import { supabase } from './services/supabase/supabaseClient';

export type RootStackParamList = {
  App: undefined;
  Auth: undefined;
  ProfileCreation: undefined;
  EmailVerification: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['focuspact://', 'com.main.focuspact://', 'exp+focuspact://'],
  config: {
    screens: {
      EmailVerification: 'verify-email',
      App: {
        screens: {
          Home: 'home',
          Supporters: 'supporters',
          Goals: 'goals',
          Limits: 'limits',
          You: 'you',
        },
      },
      Auth: {
        screens: {
          SignIn: 'sign-in',
          SignUp: 'sign-up',
          CheckEmail: 'check-email',
        },
      },
      ProfileCreation: 'create-profile',
    },
  },
  async getInitialURL() {
    // First, you would want to get the initial URL from Linking
    const url = await Linking.getInitialURL();
    return url;
  },
  subscribe(listener) {
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    return () => {
      linkingSubscription.remove();
    };
  },
};

const AppContent: React.FC = () => {
  const { user, loading, profileExists } = useContext(AuthContext);

  useEffect(() => {
    // Handle deep linking
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (url) {
        console.log('Deep link URL:', url);
        try {
          // Handle OAuth redirect
          if (url.includes('access_token') || url.includes('error')) {
            const parsedURL = new URL(url);
            const params = Object.fromEntries(parsedURL.searchParams.entries());
            
            if (params.error) {
              console.error('OAuth error:', params.error_description || params.error);
            } else if (params.access_token) {
              const { data: { user }, error } = await supabase.auth.getUser(params.access_token);
              if (error) {
                console.error('Error getting user:', error.message);
              } else {
                console.log('Successfully authenticated user:', user?.email);
              }
            }
          }
        } catch (error) {
          console.error('Error handling deep link:', error);
        }
      }
    };

    // Set up deep link handler
    Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      // Clean up
      Linking.removeAllListeners('url');
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            {!profileExists ? (
              <RootStack.Screen
                name="ProfileCreation"
                component={ProfileCreationScreen}
              />
            ) : (
              <RootStack.Screen name="App" component={BottomTabNavigator} />
            )}
            <RootStack.Screen
              name="EmailVerification"
              component={EmailVerificationScreen}
            />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigation} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});