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
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { friendlyError } from '../utils/errorMessages';

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'IncidentReview'>;
type Route = NativeStackScreenProps<IncidentStackParamList, 'IncidentReview'>['route'];

export function IncidentReviewScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { incidentId } = route.params;

  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatCouldImprove, setWhatCouldImprove] = useState('');
  const [futureAction, setFutureAction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!whatWentWell.trim() && !whatCouldImprove.trim() && !futureAction.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await incidentService.createIncidentReview(incidentId, {
        whatWentWell: whatWentWell.trim() || undefined,
        whatCouldImprove: whatCouldImprove.trim() || undefined,
        futureAction: futureAction.trim() || undefined,
      });
      showSuccessOverlay('Review saved');
      navigation.goBack();
    } catch (err) {
      setError(friendlyError(err));
      showErrorOverlay("Couldn't save review");
    } finally {
      setSubmitting(false);
    }
  };

  const hasContent = whatWentWell.trim() || whatCouldImprove.trim() || futureAction.trim();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Post-Incident Review" subtitle="Retrospective & Wisdom" onBack={() => navigation.goBack()} showNotificationBell={false} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <Text style={styles.intro}>
            Reflecting together strengthens your relationship. Answer whichever questions feel right.
          </Text>

          {[
            { label: 'What went well?', value: whatWentWell, onChange: setWhatWentWell, placeholder: 'What did you handle thoughtfully?' },
            { label: 'What could improve?', value: whatCouldImprove, onChange: setWhatCouldImprove, placeholder: 'What would you do differently next time?' },
            { label: 'What should we do differently?', value: futureAction, onChange: setFutureAction, placeholder: 'A concrete action or agreement going forward.' },
          ].map(field => (
            <View key={field.label}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={[styles.input, styles.medium]}
                value={field.value}
                onChangeText={field.onChange}
                placeholder={field.placeholder}
                placeholderTextColor={colors.neutralMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={2000}
                inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
              />
            </View>
          ))}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.btn, (!hasContent || submitting) && styles.btnDisabled]}
            onPress={hasContent && !submitting ? submit : undefined}
            android_ripple={{ color: 'rgba(10,20,15,0.25)' }}
          >
            {submitting
              ? <ActivityIndicator color={colors.ctaText} />
              : <Text style={styles.btnText}>Save Review</Text>}
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
  intro: { ...typography.body, color: colors.neutralMuted, lineHeight: 22, marginBottom: spacing.lg },
  label: { ...typography.label, color: colors.gold, marginBottom: 6, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.neutral,
    ...typography.body,
  },
  medium: { minHeight: 90 },
  error: { ...typography.bodySm, color: '#B34040', marginTop: spacing.md },
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
