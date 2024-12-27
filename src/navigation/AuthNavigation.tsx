// src/navigation/AuthNavigation.tsx

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import CheckEmailScreen from '../screens/auth/CheckEmailScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  CheckEmail: undefined;
  EmailVerification: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigation: React.FC = () => {
  return (
    <AuthStack.Navigator initialRouteName="SignIn">
      <AuthStack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="CheckEmail"
        component={CheckEmailScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
        options={{ headerShown: false }}
      />
    </AuthStack.Navigator>
  );
};

export default AuthNavigation;