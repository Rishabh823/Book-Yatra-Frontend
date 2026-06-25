import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { isFirstLaunch } from '../lib/onboarding';
import { colors } from '../lib/theme';

export default function Index() {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    isFirstLaunch().then((first) => {
      setTarget(first ? '/onboarding/country' : '/(tabs)');
    });
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <Redirect href={target} />;
}
