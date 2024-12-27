// src/types/navigation.ts
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  Home: undefined;
  CheckEmail: undefined;
  ProfileCreation: undefined;
  Goals: undefined;
  EmailVerification: undefined;
};

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  CheckEmail: undefined;
  EmailVerification: undefined; // Added
};

export type AppStackParamList = {
  Home: undefined;
  CreateProfile: undefined;
  // Add other authenticated screens here
};

export type BottomTabParamList = {
  Home: undefined;
  Supporters: undefined;
  Limits: undefined;
  You: undefined;
  // Exclude 'Goals' as it's handled by the root stack
};

export type SignInScreenProps = NativeStackScreenProps<RootStackParamList, 'SignIn'>;
export type SignUpScreenProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;