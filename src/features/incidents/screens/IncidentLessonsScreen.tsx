import React, { useCallback, useEffect, useState } from 'react';
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
import { EmptyState } from '../components/EmptyState';
import { incidentService } from '../services/incidentService';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { friendlyError, formatRelativeDate } from '../utils/errorMessages';
import type { IncidentLesson } from '../types/incident.types';

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'IncidentLessons'>;
type Route = NativeStackScreenProps<IncidentStackParamList, 'IncidentLessons'>['route'];

export function IncidentLessonsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { incidentId } = route.params;

  const [lessons, setLessons] = useState<IncidentLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await incidentService.getIncidentLessons(incidentId);
      setLessons(data);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!draft.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await incidentService.addIncidentLesson(incidentId, draft.trim());
      showSuccessOverlay('Lesson saved');
      setDraft('');
      await load();
    } catch (err) {
      setError(friendlyError(err));
      showErrorOverlay("Couldn't save lesson");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Lessons Learned"
        subtitle={lessons.length > 0 ? `${lessons.length} recorded` : undefined}
        onBack={() => navigation.goBack()}
        showNotificationBell={false}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.gold} size="large" /></View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.intro}>
              What did you both learn? Capturing lessons helps you grow together and avoid repeating the same patterns.
            </Text>

            {lessons.length === 0 ? (
              <EmptyState icon="🌱" title="No lessons yet" message="Add the first insight from working through this together." />
            ) : (
              lessons.map(l => (
                <View key={l.id} style={styles.lessonCard}>
                  <Text style={styles.lessonText}>{l.lesson}</Text>
                  <Text style={styles.lessonMeta}>{l.createdBy.name} · {formatRelativeDate(l.createdAt)}</Text>
                </View>
              ))
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
        )}

        <View style={styles.footer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a lesson…"
            placeholderTextColor={colors.neutralMuted}
            multiline
            maxLength={1000}
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />
          <Pressable
            style={[styles.btn, (!draft.trim() || submitting) && styles.btnDisabled]}
            onPress={draft.trim() && !submitting ? submit : undefined}
            android_ripple={{ color: 'rgba(10,20,15,0.25)' }}
          >
            {submitting
              ? <ActivityIndicator color={colors.ctaText} />
              : <Text style={styles.btnText}>Add</Text>}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  intro: { ...typography.body, color: colors.neutralMuted, lineHeight: 22, marginBottom: spacing.lg },
  lessonCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
  },
  lessonText: { ...typography.body, color: colors.neutral, lineHeight: 22, marginBottom: 6 },
  lessonMeta: { ...typography.bodySm, color: colors.neutralMuted },
  error: { ...typography.bodySm, color: '#B34040', marginTop: spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.neutral,
    ...typography.body,
    maxHeight: 120,
  },
  btn: {
    backgroundColor: colors.ctaBackground,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { ...typography.bodySemiBold, color: colors.ctaText },
});
