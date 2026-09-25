import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'ResolveIncident'>;
type Route = NativeStackScreenProps<IncidentStackParamList, 'ResolveIncident'>['route'];

export function ResolveIncidentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { incidentId } = route.params;

  const [resolution, setResolution] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!resolution.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await incidentService.resolveIncident(incidentId, resolution.trim(), notes.trim() || undefined);
      // Return to the Desk overview (the ticket list) rather than the just-resolved
      // ticket detail. popToTop unwinds HelpDesk → IncidentDetail → ResolveIncident
      // back to the HelpDesk screen at the root of the stack.
      navigation.popToTop();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Resolve Incident" subtitle="Agree on a resolution" onBack={() => navigation.goBack()} showNotificationBell={false} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Capture the agreement you reached together. This becomes part of the incident's resolution record.
            </Text>
          </View>

          <Text style={styles.label}>Resolution *</Text>
          <TextInput
            style={[styles.input, styles.tall]}
            value={resolution}
            onChangeText={setResolution}
            placeholder="What did you agree on together?"
            placeholderTextColor={colors.neutralMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={2000}
            autoFocus
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.medium]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any follow-ups or context to remember."
            placeholderTextColor={colors.neutralMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={2000}
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.btn, (!resolution.trim() || submitting) && styles.btnDisabled]}
            onPress={resolution.trim() && !submitting ? submit : undefined}
            android_ripple={{ color: 'rgba(10,20,15,0.25)' }}
          >
            {submitting
              ? <ActivityIndicator color={colors.ctaText} />
              : <Text style={styles.btnText}>Mark Resolved</Text>}
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
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  infoBox: {
    backgroundColor: 'rgba(76,175,125,0.08)',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(76,175,125,0.25)',
  },
  infoText: { ...typography.bodySm, color: colors.rhythmComplete, lineHeight: 18 },
  label: { ...typography.label, color: colors.neutralMuted, marginBottom: 6, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.neutral,
    ...typography.body,
  },
  tall: { minHeight: 120 },
  medium: { minHeight: 80 },
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
