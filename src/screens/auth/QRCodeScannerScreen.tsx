// src/screens/auth/QRCodeScannerScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { RNCamera } from 'react-native-camera';
import { useNavigation } from '@react-navigation/native';

const QRCodeScannerScreen: React.FC = () => {
  const navigation = useNavigation();

  const onSuccess = (e: any) => {
    // Handle the scanned QR code data
    // Example: Parse user ID and send a friend request
    const scannedData = e.data;
    Alert.alert('QR Code Scanned', `Data: ${scannedData}`);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <QRCodeScanner
        onRead={onSuccess}
        flashMode={RNCamera.Constants.FlashMode.auto}
        topContent={<Text style={styles.centerText}>Scan the QR Code to add a friend</Text>}
        bottomContent={<Text style={styles.centerText}>Align the QR code within the frame</Text>}
      />
    </View>
  );
};

export default QRCodeScannerScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerText: {
    flex: 0,
    fontSize: 18,
    padding: 32,
    color: '#777777',
    textAlign: 'center',
  },
});