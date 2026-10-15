/**
 * Card selector utility for daily gifts and vault items.
 *
 * Card art lives in images/cards as card1.png, card2.png, and so on. The list
 * is read from cardImages.generated.ts, which scripts/generate-card-images.js
 * rebuilds from that folder (Metro needs literal require() calls, so it can't
 * be done at runtime). Add a new cardN.png and run `npm run cards`, or just
 * start the app, since start/ios/android regenerate it automatically.
 */

import type { ImageSourcePropType } from 'react-native';

import { CARD_IMAGES, CARD_NUMBERS } from './cardImages.generated';

const CARD_COUNT = CARD_NUMBERS.length;

/**
 * Get the total number of available cards
 */
export function getTotalCardCount(): number {
  return CARD_COUNT;
}

/**
 * Get a random card number from the available cards
 */
export function getRandomCardNumber(): number {
  return CARD_NUMBERS[Math.floor(Math.random() * CARD_COUNT)];
}

/**
 * Get the image source for a specific card number
 */
export function getCardImage(cardNumber: number): ImageSourcePropType {
  const image = CARD_IMAGES[cardNumber];
  if (!image) {
    console.warn(`Invalid card number ${cardNumber}, using card ${CARD_NUMBERS[0]}`);
    return CARD_IMAGES[CARD_NUMBERS[0]];
  }
  return image;
}

/**
 * Get a random card image
 */
export function getRandomCardImage(): ImageSourcePropType {
  return CARD_IMAGES[getRandomCardNumber()];
}

/**
 * Get both the card number and image together (useful for storing references)
 */
export function getRandomCard(): { cardNumber: number; cardImage: ImageSourcePropType } {
  const cardNumber = getRandomCardNumber();
  return {
    cardNumber,
    cardImage: CARD_IMAGES[cardNumber],
  };
}

/**
 * Get all available card numbers, in order
 */
export function getAllCardNumbers(): number[] {
  return [...CARD_NUMBERS];
}
