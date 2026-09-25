/**
 * Card selector utility for daily gifts and vault items.
 * 
 * Provides functions to randomly select card images from the available
 * card set (card1.png through card10.png). Each card is a surprise
 * collectible visual that accompanies daily gifts.
 */

import type { ImageSourcePropType } from 'react-native';

// All available card images (card1.png through card10.png)
const CARD_IMAGES: Record<number, ImageSourcePropType> = {
  1: require('../../images/cards/card1.png'),
  2: require('../../images/cards/card2.png'),
  3: require('../../images/cards/card3.png'),
  4: require('../../images/cards/card4.png'),
  5: require('../../images/cards/card5.png'),
  6: require('../../images/cards/card6.png'),
  7: require('../../images/cards/card7.png'),
  8: require('../../images/cards/card8.png'),
  9: require('../../images/cards/card9.png'),
  10: require('../../images/cards/card10.png'),
};

const CARD_COUNT = 10;

/**
 * Get a random card number (1-10)
 */
export function getRandomCardNumber(): number {
  return Math.floor(Math.random() * CARD_COUNT) + 1;
}

/**
 * Get the image source for a specific card number
 */
export function getCardImage(cardNumber: number): ImageSourcePropType {
  if (cardNumber < 1 || cardNumber > CARD_COUNT) {
    console.warn(`Invalid card number ${cardNumber}, using card 1`);
    return CARD_IMAGES[1];
  }
  return CARD_IMAGES[cardNumber];
}

/**
 * Get a random card image
 */
export function getRandomCardImage(): ImageSourcePropType {
  const cardNumber = getRandomCardNumber();
  return CARD_IMAGES[cardNumber];
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
