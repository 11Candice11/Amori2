/**
 * AddDateIdeaScreen — compose a new date idea: a photo, a title, a description,
 * a location, an estimated cost and a link (the wish form plus the two
 * date-specific fields). When an idea is passed in the route params (`idea`)
 * the same form edits it instead, pre-filled.
 *
 *   POST  /api/media       → upload the photo, get a fileKey (see ItemComposeForm)
 *   POST  /api/dates       → create the idea (Romantic category, as before)
 *   PATCH /api/dates/{id}  → save edits (either partner may edit)
 *
 * Location uses the same place search as calendar events and, like them, only
 * the address text is stored. Cost is in euros; 0 means free and an empty field
 * means no cost.
 *
 * On PATCH, null means "leave unchanged" and an empty string means "clear", so
 * removing the photo or emptying the link or location sends ''. A cost can't be
 * sent as null to clear it, so that uses `clearEstimatedCost`. Category and
 * duration are not part of this form and are left as they are.
 */
import React, { useCallback, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import {
  KEYBOARD_DONE_ACCESSORY_ID,
  LocationPicker,
  type LocationValue,
} from '../../../shared/components/inputs';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { togetherService } from '../services/togetherService';
import { ItemComposeForm, type ItemFormValues } from '../components/ItemComposeForm';
import { FormField, FormLabel } from '../components/FormField';
import { COST_ERROR, parseCost } from '../utils/cost';
import type { UpdateDateIdeaRequest } from '../types/together.types';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'AddDateIdea'>;
type Rt = RouteProp<TogetherStackParamList, 'AddDateIdea'>;

// Matches the backend column limit for location.
const MAX_LOCATION = 300;

export function AddDateIdeaScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  /** The idea being edited, or null when composing a new one. */
  const editing = route.params?.idea ?? null;

  // Only the address text is stored, so an edit seeds a text-only value.
  const [location, setLocation] = useState<LocationValue | null>(
    editing?.location ? { location: editing.location, latitude: null, longitude: null } : null,
  );
  const [cost, setCost] = useState(editing?.estimatedCost != null ? String(editing.estimatedCost) : '');

  const validate = useCallback(() => (parseCost(cost).ok ? null : COST_ERROR), [cost]);

  const handleSubmit = useCallback(
    async (values: ItemFormValues) => {
      const parsed = parseCost(cost);
      const estimatedCost = parsed.ok ? parsed.value : null;
      const locationText = location?.location.trim().slice(0, MAX_LOCATION) ?? '';

      if (editing) {
        // '' clears text fields; a cost is cleared with its own flag.
        const payload: UpdateDateIdeaRequest = {
          title: values.title,
          description: values.description,
          imageKey: values.imageKey ?? '',
          url: values.link ?? '',
          location: locationText,
          ...(estimatedCost != null ? { estimatedCost } : { clearEstimatedCost: true }),
        };
        await togetherService.updateDateIdea(editing.id, payload);
        showSuccessOverlay('Date idea saved');
      } else {
        await togetherService.createDateIdea(values.title, undefined, {
          description: values.description ? values.description : null,
          imageKey: values.imageKey,
          url: values.link,
          location: locationText ? locationText : null,
          estimatedCost,
        });
        showSuccessOverlay('Date idea added');
      }
      navigation.goBack();
    },
    [editing, navigation, location, cost],
  );

  return (
    <ItemComposeForm
      headerTitle={editing ? 'Edit date idea' : 'Add a date idea'}
      saveLabel={editing ? 'Save changes' : 'Save date idea'}
      saveAccessibilityLabel="Save date idea"
      noun="date idea"
      titleLabel="DATE IDEA"
      titlePlaceholder="Sunset picnic by the lake…"
      descriptionPlaceholder="What you'd do, what to bring, why it's perfect…"
      linkPlaceholder="A venue, recipe or booking page"
      filePrefix="date"
      failureOverlay={editing ? "Couldn't save date idea" : "Couldn't add date idea"}
      initial={
        editing
          ? {
              title: editing.title,
              description: editing.description,
              link: editing.url,
              image:
                editing.imageKey && editing.imageUrl
                  ? { fileKey: editing.imageKey, url: resolveMediaUrl(editing.imageUrl) }
                  : null,
            }
          : undefined
      }
      extraFields={
        <>
          <FormLabel>LOCATION</FormLabel>
          <LocationPicker
            value={location}
            onChange={setLocation}
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />
          <FormField
            label="ESTIMATED COST (€)"
            placeholder="e.g. 25 (0 for free)"
            value={cost}
            onChangeText={setCost}
            keyboardType="decimal-pad"
            maxLength={12}
            accessibilityLabel="Date idea cost"
          />
        </>
      }
      validate={validate}
      onSubmit={handleSubmit}
      onBack={() => navigation.goBack()}
    />
  );
}
