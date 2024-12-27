// src/navigation/AppNavigation.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator'; // Import BottomTabNavigator
import GoalsScreen from '../screens/auth/GoalsScreen';
import ProfileCreationScreen from '../screens/auth/ProfileCreationScreen';
// Import additional authenticated screens as needed

export type AppStackParamList = {
  MainTabs: undefined;
  CreateProfile: undefined;
  Goals: undefined; // Add Goals to the stack
  // Define additional routes here
};

const AppStack = createNativeStackNavigator<AppStackParamList>();

const AppNavigation: React.FC = () => {
  return (
    <NavigationContainer>
      <AppStack.Navigator initialRouteName="MainTabs">
        <AppStack.Screen
          name="MainTabs"
          component={BottomTabNavigator}
          options={{ headerShown: false }}
        />
        <AppStack.Screen
          name="CreateProfile"
          component={ProfileCreationScreen}
          options={{ title: 'Create Profile', headerShown: true }}
        />
        <AppStack.Screen
          name="Goals"
          component={GoalsScreen}
          options={{ title: 'Goals', headerShown: true }}
        />
        {/* Add additional authenticated screens here */}
      </AppStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigation;