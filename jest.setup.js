/* eslint-disable no-undef */
// Jest setup for the Amori app.
//
// Registers the official in-memory AsyncStorage mock so stores that persist to
// disk (e.g. the Let's Chat draft store) can be unit-tested without a native
// module. See @react-native-async-storage/async-storage/jest/async-storage-mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
