// src/screens/auth/YouScreen.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const YouScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>You Screen</Text>
    </View>
  );
};

export default YouScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});