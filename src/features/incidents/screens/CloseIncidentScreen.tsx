import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { IncidentStackParamList } from '../../../navigation/IncidentStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import {
  KeyboardDoneAccessory,
  KEYBOARD_DONE_ACCESSORY_ID,
} from '../../../shared/components/inputs';
import { AppHeader } from '../../../shared/components/header';
import { incidentService } from '../services/incidentService';
import { friendlyError } from '../utils/errorMessages';

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'CloseIncident'>;
type Route = NativeStackScreenProps<IncidentStackParamList, 'CloseIncident'>['route'];

export function CloseIncidentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { incidentId } = route.params;

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await incidentService.closeIncident(incidentId, notes.trim() || undefined);
      // Once closed, the incident is archived — send the user back to the full
      // incident list rather than the now-stale detail screen they came from.
      navigation.navigate('IncidentList', { filter: 'all' });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Close Incident" onBack={() => navigation.goBack()} showNotificationBell={false} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Closing archives this incident. You can still reopen it later if the topic resurfaces.
            </Text>
          </View>

          <Text style={styles.label}>Closing notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.tall]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any final reflection before closing."
            placeholderTextColor={colors.neutralMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={2000}
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.btn, submitting && styles.btnDisabled]}
            onPress={!submitting ? submit : undefined}
            android_ripple={{ color: 'rgba(10,20,15,0.25)' }}
          >
            {submitting
              ? <ActivityIndicator color={colors.ctaText} />
              : <Text style={styles.btnText}>Close Incident</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <KeyboardDoneAccessory />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flex: 1, padding: spacing.md },
  infoBox: {
    backgroundColor: 'rgba(150,150,150,0.1)',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  infoText: { ...typography.bodySm, color: colors.neutralMuted, lineHeight: 18 },
  label: { ...typography.label, color: colors.neutralMuted, marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.neutral,
    ...typography.body,
  },
  tall: { minHeight: 140 },
  error: { ...typography.bodySm, color: '#B34040', marginTop: spacing.sm },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  btn: {
    backgroundColor: colors.ctaBackground,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 16 },
});
