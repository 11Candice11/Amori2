/**
 * AddWishlistItemScreen — compose a new wish for the shared wishlist: a photo,
 * a title, a description, an estimated cost and a link, the same shape as
 * adding to the Vision Board. When a wish is passed in the route params
 * (`item`) the same form edits it instead, pre-filled with its current values.
 *
 *   POST  /api/media          → upload the photo, get a fileKey (see ItemComposeForm)
 *   POST  /api/wishlist       → create the item with that key attached
 *   PATCH /api/wishlist/{id}  → save edits (owner only, enforced by the backend)
 *
 * Cost is in euros; 0 means free and an empty field means no cost (stored as
 * the wish's `price`).
 *
 * On PATCH, null means "leave unchanged" and an empty string means "clear", so
 * removing the photo or emptying the link sends ''. A price can't be sent as
 * null to clear it, so that uses `clearPrice`.
 */
import React, { useCallback, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { togetherService } from '../services/togetherService';
import { ItemComposeForm, type ItemFormValues } from '../components/ItemComposeForm';
import { FormField } from '../components/FormField';
import { COST_ERROR, parseCost } from '../utils/cost';
import type {
  CreateWishlistItemRequest,
  UpdateWishlistItemRequest,
} from '../types/together.types';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'AddWishlistItem'>;
type Rt = RouteProp<TogetherStackParamList, 'AddWishlistItem'>;

export function AddWishlistItemScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  /** The wish being edited, or null when composing a new one. */
  const editing = route.params?.item ?? null;

  const [cost, setCost] = useState(editing?.price != null ? String(editing.price) : '');

  const validate = useCallback(() => (parseCost(cost).ok ? null : COST_ERROR), [cost]);

  const handleSubmit = useCallback(
    async (values: ItemFormValues) => {
      const parsed = parseCost(cost);
      const price = parsed.ok ? parsed.value : null;

      if (editing) {
        // '' clears text fields; a price is cleared with its own flag.
        const payload: UpdateWishlistItemRequest = {
          name: values.title,
          description: values.description,
          imageKey: values.imageKey ?? '',
          url: values.link ?? '',
          ...(price != null ? { price } : { clearPrice: true }),
        };
        await togetherService.updateWishlistItem(editing.id, payload);
        showSuccessOverlay('Wish saved');
      } else {
        const payload: CreateWishlistItemRequest = {
          name: values.title,
          description: values.description ? values.description : null,
          imageKey: values.imageKey,
          price,
          url: values.link,
        };
        await togetherService.createWishlistItem(payload);
        showSuccessOverlay('Added to your wishlist');
      }
      navigation.goBack();
    },
    [editing, navigation, cost],
  );

  return (
    <ItemComposeForm
      headerTitle={editing ? 'Edit wish' : 'Add to Wishlist'}
      saveLabel={editing ? 'Save changes' : 'Save to Wishlist'}
      saveAccessibilityLabel="Save wishlist item"
      noun="wish"
      titleLabel="WISH TITLE"
      titlePlaceholder="What are you wishing for?"
      descriptionPlaceholder="Size, colour, why you love it…"
      linkPlaceholder="Where to find it, e.g. amazon.com/item"
      filePrefix="wish"
      failureOverlay={editing ? "Couldn't save wish" : "Couldn't add to wishlist"}
      initial={
        editing
          ? {
              title: editing.name,
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
        <FormField
          label="ESTIMATED COST (€)"
          placeholder="e.g. 25 (0 for free)"
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
          maxLength={12}
          accessibilityLabel="Wish cost"
        />
      }
      validate={validate}
      onSubmit={handleSubmit}
      onBack={() => navigation.goBack()}
    />
  );
}
