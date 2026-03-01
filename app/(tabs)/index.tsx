import { useI18n } from '@/lib/i18n-context';
import { Text, View } from 'react-native';

export default function HomeScreen() {
  const { t } = useI18n();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{t('home')}</Text>
    </View>
  );
}
