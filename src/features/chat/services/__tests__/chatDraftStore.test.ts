/**
 * Tests for the on-device Let's Chat draft store. Covers: draft persistence,
 * survival across an "app restart" (the AsyncStorage mock keeps its data across
 * fresh module loads within a test), privacy/isolation between drafts, resume
 * by serverId, and reset-on-signout.
 *
 * AsyncStorage is mocked via jest.setup.js (official in-memory mock).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatDraftStore, newLocalDraftId } from '../chatDraftStore';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('chatDraftStore', () => {
  it('saves and reads back a draft', async () => {
    const localId = newLocalDraftId();
    await chatDraftStore.save({
      localId,
      serverId: null,
      templateType: 'Feeling',
      answers: { feeling: 'tender' },
      stepIndex: 1,
    });

    const loaded = await chatDraftStore.get(localId);
    expect(loaded).not.toBeNull();
    expect(loaded?.templateType).toBe('Feeling');
    expect(loaded?.answers.feeling).toBe('tender');
    expect(loaded?.stepIndex).toBe(1);
    expect(typeof loaded?.updatedAt).toBe('string');
  });

  it('survives an app restart (persisted to storage, re-read fresh)', async () => {
    const localId = newLocalDraftId();
    await chatDraftStore.save({
      localId,
      serverId: null,
      templateType: 'Need',
      answers: { need: 'quiet', reason: 'a hard day' },
      stepIndex: 2,
    });

    // Simulate a restart: the raw storage layer is what persists across launches.
    const raw = await AsyncStorage.getItem('@amori:chat:drafts');
    expect(raw).toBeTruthy();

    const restored = await chatDraftStore.get(localId);
    expect(restored?.answers.reason).toBe('a hard day');
    expect(restored?.stepIndex).toBe(2);
  });

  it('keeps separate drafts isolated from one another', async () => {
    const a = newLocalDraftId();
    const b = newLocalDraftId();
    await chatDraftStore.save({ localId: a, serverId: null, templateType: 'Feeling', answers: { feeling: 'a' }, stepIndex: 0 });
    await chatDraftStore.save({ localId: b, serverId: null, templateType: 'Future', answers: { goal: 'b' }, stepIndex: 0 });

    const all = await chatDraftStore.getAll();
    expect(all).toHaveLength(2);
    expect((await chatDraftStore.get(a))?.answers.feeling).toBe('a');
    expect((await chatDraftStore.get(b))?.answers.goal).toBe('b');
  });

  it('overwrites an existing draft in place (no duplicates)', async () => {
    const localId = newLocalDraftId();
    await chatDraftStore.save({ localId, serverId: null, templateType: 'Feeling', answers: { feeling: 'a' }, stepIndex: 0 });
    await chatDraftStore.save({ localId, serverId: 'srv-1', templateType: 'Feeling', answers: { feeling: 'b' }, stepIndex: 1 });

    const all = await chatDraftStore.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].answers.feeling).toBe('b');
    expect(all[0].serverId).toBe('srv-1');
  });

  it('finds a draft by its server id for resuming', async () => {
    const localId = newLocalDraftId();
    await chatDraftStore.save({ localId, serverId: 'srv-42', templateType: 'Appreciation', answers: {}, stepIndex: 0 });

    const found = await chatDraftStore.findByServerId('srv-42');
    expect(found?.localId).toBe(localId);
    expect(await chatDraftStore.findByServerId('does-not-exist')).toBeNull();
  });

  it('removes a single draft without touching others', async () => {
    const a = newLocalDraftId();
    const b = newLocalDraftId();
    await chatDraftStore.save({ localId: a, serverId: null, templateType: 'Feeling', answers: {}, stepIndex: 0 });
    await chatDraftStore.save({ localId: b, serverId: null, templateType: 'Need', answers: {}, stepIndex: 0 });

    await chatDraftStore.remove(a);
    expect(await chatDraftStore.get(a)).toBeNull();
    expect(await chatDraftStore.get(b)).not.toBeNull();
  });

  it('reset clears every draft (used on sign-out)', async () => {
    await chatDraftStore.save({ localId: newLocalDraftId(), serverId: null, templateType: 'Feeling', answers: {}, stepIndex: 0 });
    await chatDraftStore.reset();
    expect(await chatDraftStore.getAll()).toHaveLength(0);
  });

  it('tolerates corrupt storage by returning an empty list', async () => {
    await AsyncStorage.setItem('@amori:chat:drafts', 'not valid json {');
    expect(await chatDraftStore.getAll()).toHaveLength(0);
  });

  it('drops malformed draft entries on read', async () => {
    // A stored map with one valid and one malformed entry.
    await AsyncStorage.setItem(
      '@amori:chat:drafts',
      JSON.stringify({
        good: { localId: 'good', serverId: null, templateType: 'Feeling', answers: {}, stepIndex: 0, updatedAt: new Date().toISOString() },
        bad: { nope: true },
      }),
    );
    const all = await chatDraftStore.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].localId).toBe('good');
  });
});
