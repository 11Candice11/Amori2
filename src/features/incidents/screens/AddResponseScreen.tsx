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

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'AddResponse'>;
type Route = NativeStackScreenProps<IncidentStackParamList, 'AddResponse'>['route'];

const MAX = 4000;

export function AddResponseScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { incidentId } = route.params;

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await incidentService.addIncidentResponse(incidentId, message.trim());
      showSuccessOverlay('Response added');
      navigation.goBack();
    } catch (err) {
      setError(friendlyError(err));
      showErrorOverlay("Couldn't add response");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Add Response" onBack={() => navigation.goBack()} showNotificationBell={false} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Text style={styles.hint}>
            Your response will be visible to both partners in the incident thread.
          </Text>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Write your response…"
            placeholderTextColor={colors.neutralMuted}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={MAX}
            autoFocus
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />
          <Text style={styles.count}>{message.length}/{MAX}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
        <View style={styles.footer}>
          <Pressable
            style={[styles.btn, (!message.trim() || submitting) && styles.btnDisabled]}
            onPress={message.trim() && !submitting ? submit : undefined}
            android_ripple={{ color: 'rgba(10,20,15,0.25)' }}
          >
            {submitting
              ? <ActivityIndicator color={colors.ctaText} />
              : <Text style={styles.btnText}>Submit Response</Text>}
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
  hint: { ...typography.bodySm, color: colors.neutralMuted, marginBottom: spacing.md, lineHeight: 18 },
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
