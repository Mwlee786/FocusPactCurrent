// src/navigation/BottomTabNavigator.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/auth/HomeScreen';
import SupportersScreen from '../screens/auth/SupportersScreen';
import GoalsScreen from '../screens/auth/GoalsScreen';
import LimitsScreen from '../screens/auth/LimitsScreen';
import YouScreen from '../screens/auth/YouScreen';
import Ionicons from 'react-native-vector-icons/Ionicons';
const Tab = createBottomTabNavigator();
const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons name="home" size={24} color={focused ? '#4CAF50' : '#748c94'} />
          ),
        }}
      />
      <Tab.Screen
        name="Supporters"
        component={SupportersScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons name="people" size={24} color={focused ? '#4CAF50' : '#748c94'} />
          ),
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons name="add-circle" size={48} color="#4CAF50" />
          ),
        }}
      />
      <Tab.Screen
        name="Limits"
        component={LimitsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons name="document-text" size={24} color={focused ? '#4CAF50' : '#748c94'} />
          ),
        }}
      />
      <Tab.Screen
        name="You"
        component={YouScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons name="person" size={24} color={focused ? '#4CAF50' : '#748c94'} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        // Customize the Goals button
        if (route.name === 'Goals') {
          return (
            <TouchableOpacity
              key={route.name}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.goalsButton}
            >
              {options.tabBarIcon?.({ focused: isFocused, color: isFocused ? '#4CAF50' : '#748c94', size: 24 })}
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity
            key={route.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={styles.tabButton}
          >
            {options.tabBarIcon?.({ focused: isFocused, color: isFocused ? '#4CAF50' : '#748c94', size: 24 })}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#dcdcdc',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalsButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 10 : 10,
    left: '55%',
    transform: [{ translateX: -30 }],
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabBar: {
    height: 60,
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#dcdcdc',
  },
});
export default BottomTabNavigator;