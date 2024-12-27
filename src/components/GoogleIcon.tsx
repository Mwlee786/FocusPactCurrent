import React from 'react';
import { View } from 'react-native';

interface GoogleIconProps {
  size?: number;
}

const GoogleIcon: React.FC<GoogleIconProps> = ({ size = 24 }) => {
  return (
    <View 
      style={{ 
        width: size, 
        height: size, 
        backgroundColor: '#4285F4',
        borderRadius: size / 2,
      }} 
    />
  );
};

export default GoogleIcon;