import { View, Text, Button, StyleSheet } from 'react-native';
import React from 'react';
import { checkProfile, signOut } from '@/src/api/api';
import { useRouter } from 'expo-router';

const HomeScreen = () => {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleCheckProfile = async () => {
    const response = await checkProfile();
    console.log("profile", response.data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Welcome Home</Text>

      <View style={styles.buttonGroup}>
        <Button title="Check Profile" onPress={handleCheckProfile} />
      </View>

      <View style={styles.buttonGroup}>
        <Button title="Sign Out" onPress={handleSignOut} color="crimson" />
      </View>

      <View style={styles.buttonGroup}>
        <Button
          title="Inbox Testing"
          onPress={() => router.push('/(inbox)/New')}
        />
      </View>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
  },
  buttonGroup: {
    marginBottom: 16,
  },
});
