import { getAuthToken } from '@/lib/auth-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function IndexScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const token = await getAuthToken();
      setIsLoggedIn(Boolean(token));
      setIsLoading(false);
    };

    checkSession();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={isLoggedIn ? '/(tabs)' : '/login'} />;
}
