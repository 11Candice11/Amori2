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
import { IncidentScreenHeader } from '../components/IncidentScreenHeader';
import { incidentService } from '../services/incidentService';
import { friendlyError } from '../utils/errorMessages';

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'ReopenIncident'>;
type Route = NativeStackScreenProps<IncidentStackParamList, 'ReopenIncident'>['route'];

export function ReopenIncidentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { incidentId } = route.params;

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await incidentService.reopenIncident(incidentId, reason.trim());
      // Pop back to detail — the detail will refresh on focus
      navigation.goBack();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <IncidentScreenHeader title="Reopen Incident" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Reopening will return this incident to the active workflow. Please provide a reason so both partners understand why.
            </Text>
          </View>

          <Text style={styles.label}>Reason *</Text>
          <TextInput
            style={[styles.input, styles.tall]}
            value={reason}
            onChangeText={setReason}
            placeholder="Why is this being reopened? What resurfaced?"
            placeholderTextColor={colors.neutralMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={2000}
            autoFocus
          />
          <Text style={styles.count}>{reason.length}/2000</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.btn, (!reason.trim() || submitting) && styles.btnDisabled]}
            onPress={reason.trim() && !submitting ? submit : undefined}
            android_ripple={{ color: 'rgba(10,20,15,0.25)' }}
          >
            {submitting
              ? <ActivityIndicator color={colors.ctaText} />
              : <Text style={styles.btnText}>Reopen Incident</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flex: 1, padding: spacing.md },
  warningBox: {
    backgroundColor: 'rgba(179,64,64,0.08)',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(179,64,64,0.25)',
  },
  warningText: { ...typography.bodySm, color: '#B34040', lineHeight: 18 },
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
  count: { ...typography.bodySm, color: colors.neutralMuted, textAlign: 'right', marginTop: 4 },
  error: { ...typography.bodySm, color: '#B34040', marginTop: spacing.sm },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  btn: {
    backgroundColor: '#B34040',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { ...typography.bodySemiBold, color: '#FDFCF0', fontSize: 16 },
});
