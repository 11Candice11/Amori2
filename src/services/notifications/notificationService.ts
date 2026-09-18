/**
 * notificationService — device registration + in-app notification access.
 *
 * Backend routes (see Amori.Api/Features/Notifications/NotificationsController):
 *   POST   /api/notifications/devices           → register this device's push token
 *   DELETE /api/notifications/devices/{id}       → deregister a device
 *   GET    /api/notifications                    → list notifications (newest first)
 *   POST   /api/notifications/{id}/read          → mark one read
 *   POST   /api/notifications/read-all           → mark all read
 */
import { api } from '../api/client';
import type {
  DeviceRegistrationResponse,
  NotificationResponse,
  RegisterDeviceRequest,
} from '../api/types';
import { currentPlatform, getPushToken } from './pushToken';

/** Remembered so we can deregister on logout if needed. */
let _registeredDeviceId: string | null = null;

export const notificationService = {
  /**
   * Register the current device for push. No-ops safely when no push token is
   * available (e.g. simulator, or no native push provider installed yet).
   * Returns the registration, or null when nothing was registered.
   */
  async registerDevice(): Promise<DeviceRegistrationResponse | null> {
    const token = await getPushToken();
    if (!token) return null;

    const payload: RegisterDeviceRequest = {
      deviceToken: token,
      platform: currentPlatform(),
    };

    try {
      const result = await api.post<DeviceRegistrationResponse>(
        '/api/notifications/devices',
        payload,
      );
      _registeredDeviceId = result.id;
      return result;
    } catch {
      // Registration is best-effort; don't block the app on failure.
      return null;
    }
  },

  async deregisterDevice(): Promise<void> {
    if (!_registeredDeviceId) return;
    try {
      await api.delete<void>(`/api/notifications/devices/${_registeredDeviceId}`);
    } catch {
      // ignore
    } finally {
      _registeredDeviceId = null;
    }
  },

  getNotifications(): Promise<NotificationResponse[]> {
    return api.get<NotificationResponse[]>('/api/notifications');
  },

  markRead(notificationId: string): Promise<NotificationResponse> {
    return api.post<NotificationResponse>(
      `/api/notifications/${notificationId}/read`,
    );
  },

  markAllRead(): Promise<void> {
    return api.post<void>('/api/notifications/read-all');
  },
};
