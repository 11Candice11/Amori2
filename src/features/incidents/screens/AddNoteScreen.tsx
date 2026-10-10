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
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { friendlyError } from '../utils/errorMessages';

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'AddNote'>;
type Route = NativeStackScreenProps<IncidentStackParamList, 'AddNote'>['route'];

const MAX = 4000;

export function AddNoteScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { incidentId } = route.params;

  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await incidentService.addIncidentNote(incidentId, content.trim());
      showSuccessOverlay('Note added');
      navigation.goBack();
    } catch (err) {
      setError(friendlyError(err));
      showErrorOverlay("Couldn't add note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Add Investigation Note" onBack={() => navigation.goBack()} showNotificationBell={false} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.noteTag}>
            <Text style={styles.noteTagText}>📝 Investigation Note — visible to both partners</Text>
          </View>
          <TextInput
            style={styles.input}
            value={content}
            onChangeText={setContent}
            placeholder="Record your observations, patterns, or context…"
            placeholderTextColor={colors.neutralMuted}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={MAX}
            autoFocus
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />
          <Text style={styles.count}>{content.length}/{MAX}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
        <View style={styles.footer}>
          <Pressable
            style={[styles.btn, (!content.trim() || submitting) && styles.btnDisabled]}
            onPress={content.trim() && !submitting ? submit : undefined}
            android_ripple={{ color: 'rgba(10,20,15,0.25)' }}
          >
            {submitting
              ? <ActivityIndicator color={colors.ctaText} />
              : <Text style={styles.btnText}>Save Note</Text>}
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
  noteTag: {
    backgroundColor: 'rgba(139,111,58,0.08)',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139,111,58,0.2)',
  },
  noteTagText: { ...typography.bodySm, color: colors.gold },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.neutral,
    ...typography.body,
    maxHeight: 280,
  },
  count: { ...typography.bodySm, color: colors.neutralMuted, textAlign: 'right', marginTop: 4 },
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
