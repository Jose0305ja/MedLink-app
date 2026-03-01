import { useI18n } from '@/lib/i18n-context';
import { Text, View } from 'react-native';

export default function CitasScreen() {
  const { t } = useI18n();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{t('appointments')}</Text>
    </View>
  );
}
