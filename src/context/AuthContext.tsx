// src/context/AuthContext.tsx

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase/supabaseClient';
import { User, Session } from '@supabase/supabase-js';

// Define a custom User interface that includes the username
interface ExtendedUser extends User {
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  bio: string;
}

interface SignUpParams {
  email: string;
  password: string;
}

interface AuthContextProps {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  profileExists: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  signOut: () => Promise<void>;
  createProfile: (user: User, firstName: string, lastName: string) => Promise<void>;
  checkProfileExists: (userId: string) => Promise<boolean>;
  getSession: (accessToken: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  session: null,
  loading: true,
  profileExists: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  createProfile: async () => {},
  checkProfileExists: async () => false,
  getSession: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileExists, setProfileExists] = useState<boolean>(false);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        setSession(data.session);
        if (data.session?.user) {
          const exists = await checkProfileExists(data.session.user.id);
          setProfileExists(exists);
          if (exists) {
            const profile = await fetchUserProfile(data.session.user.id);
            if (profile) {
              setUser({
                ...data.session.user,
                username: profile.username,
                first_name: profile.first_name,
                last_name: profile.last_name,
                avatar_url: profile.avatar_url,
                bio: profile.bio,
              });
            }
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      console.log(`Auth event: ${event}`);

      if (session?.user) {
        const exists = await checkProfileExists(session.user.id);
        setProfileExists(exists);
        if (exists) {
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            setUser({
              ...session.user,
              username: profile.username,
              first_name: profile.first_name,
              last_name: profile.last_name,
              avatar_url: profile.avatar_url,
              bio: profile.bio,
            });
          }
        } else {
          setUser(null);
        }
      } else {
        setProfileExists(false);
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string): Promise<{
    username: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
    bio: string;
  } | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, first_name, last_name, avatar_url, bio')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  const checkProfileExists = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      console.log('Profile data:', data, 'userId:', userId);
      if (error) {
        if (error.message === 'No rows found') {
          setProfileExists(false);
          return false;
        } else {
          console.error('Error fetching profile:', error.message);
          Alert.alert('Error', 'An error occurred while checking your profile.');
          return false;
        }
      } else {
        setProfileExists(true);
        return true;
      }
    } catch (error) {
      console.error('Error checking profile existence:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting to sign in with email:', email);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Sign-in error:', error.message);
        throw error;
      }
      console.log('Sign-in successful');
    } catch (error) {
      console.error('SignIn Catch Block:', error);
      throw error;
    }
  };

  const signUp = async ({ email, password }: SignUpParams) => {
    console.log('Starting sign-up process with email:', email);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'focuspact://verify-email',
        },
      });
      if (error) {
        console.error('Sign-up error:', error.message);
        throw error;
      }

      console.log('Sign-up successful, awaiting email verification');
      Alert.alert(
        'Sign Up Successful',
        'Please check your email to verify your account before signing in.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error during sign-up:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log('Attempting to sign out');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign-out error:', error.message);
        throw error;
      }
      console.log('Sign-out successful');
    } catch (error) {
      console.error('Error during sign-out:', error);
      throw error;
    }
  };

  const createProfile = async (user: User, firstName: string, lastName: string) => {
    try {
      console.log('Creating profile for user:', user.id);
      const { error } = await supabase.from('profiles').insert([
        {
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          username: `${firstName}.${lastName}`,
          avatar_url: '',
          bio: '',
        },
      ]);
      if (error) {
        console.error('Profile insert error:', error.message);
        throw error;
      }
      console.log('Profile inserted successfully');
      setProfileExists(true);
      const profile = await fetchUserProfile(user.id);
      if (profile) {
        setUser({
          ...user,
          username: profile.username,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
        });
      }
      Alert.alert('Success', 'Profile created successfully!');
    } catch (error) {
      console.error('Error creating profile:', error);
      Alert.alert('Profile Creation Error', 'An error occurred while creating your profile.');
      throw error;
    }
  };

  const getSession = async (accessToken: string) => {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '',
      });
      if (error) {
        console.error('Error setting auth:', error.message);
        throw error;
      }
      setSession(data.session);
      if (data.session?.user) {
        const exists = await checkProfileExists(data.session.user.id);
        if (exists) {
          const profile = await fetchUserProfile(data.session.user.id);
          if (profile) {
            setUser({
              ...data.session.user,
              username: profile.username,
              first_name: profile.first_name,
              last_name: profile.last_name,
              avatar_url: profile.avatar_url,
              bio: profile.bio,
            });
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error in getSession:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profileExists,
        signIn,
        signUp,
        signOut,
        createProfile,
        checkProfileExists,
        getSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};