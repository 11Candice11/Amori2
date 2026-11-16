import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../shared/theme';
import type { ChatTemplateDefinition, ChatTemplateType } from '../types/chat.types';
import { TemplateCard } from './TemplateCard';

type Props = {
  visible: boolean;
  templates: ChatTemplateDefinition[];
  onSelect: (type: ChatTemplateType) => void;
  onClose: () => void;
};

/** Bottom sheet listing every template to start a new Let's Chat from. */
export function TemplatePickerModal({ visible, templates, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close template list"
      />
      <View style={styles.sheet}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Start a chat</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {templates.map((t) => (
            <TemplateCard key={t.type} template={t} onPress={() => onSelect(t.type)} />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.headlineSm, color: colors.neutral },
  close: { ...typography.headlineSm, color: colors.neutralMuted },
});
