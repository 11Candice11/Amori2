/**
 * TypeScript types that mirror the backend DTOs.
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  /** Privacy: share mood check-ins with the partner. */
  shareMood: boolean;
  /** Privacy: share activity/presence (online) with the partner. */
  shareActivity: boolean;
  /** Privacy: share detailed check-ins with the partner. */
  shareCheckIns: boolean;
  /** Privacy: share location when sending emergency alerts. */
  shareLocation: boolean;
  /** Privacy: share timeline events with the partner. */
  shareTimeline: boolean;
  /** Privacy: allow partner to send you hugs. */
  allowHugs: boolean;
  /** Privacy: allow partner to send you emergency alerts. */
  allowEmergencyAlerts: boolean;
  /** Privacy: allow partner to set reminders for you. */
  allowPartnerReminders: boolean;
  /** Notifications: master toggle for all notifications. */
  notificationsEnabled: boolean;
  /** Notifications: receive notifications when partner sends a hug. */
  hugNotifications: boolean;
  /** Notifications: receive emergency alert notifications. */
  emergencyNotifications: boolean;
  /** Notifications: receive reminders to complete check-ins. */
  checkInReminders: boolean;
  /** Notifications: get notified when partner is active. */
  partnerActivityNotifications: boolean;
  /** Notifications: receive a daily digest of activities. */
  dailyDigest: boolean;
  /** App settings: enable sound effects. */
  soundEnabled: boolean;
  /** App settings: enable vibration feedback. */
  vibrationEnabled: boolean;
}

export interface UpdateUserSettingsRequest {
  shareMood?: boolean;
  shareActivity?: boolean;
  shareCheckIns?: boolean;
  shareLocation?: boolean;
  shareTimeline?: boolean;
  allowHugs?: boolean;
  allowEmergencyAlerts?: boolean;
  allowPartnerReminders?: boolean;
  notificationsEnabled?: boolean;
  hugNotifications?: boolean;
  emergencyNotifications?: boolean;
  checkInReminders?: boolean;
  partnerActivityNotifications?: boolean;
  dailyDigest?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
}

export interface PartnerStatusResponse {
  isLinked: boolean;
  isOnline: boolean;
  /** Null when the partner has opted out of sharing activity. */
  lastActiveAt: string | null;
}

export interface AuthResponse {
  accessToken: string;
  /** Long-lived token used to silently obtain a new access token. */
  refreshToken: string;
  /** ISO instant at which the access token expires. */
  accessTokenExpiresAt: string;
  user: UserResponse;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// ─── Relationships ────────────────────────────────────────────────────────────

export interface RelationshipMemberResponse {
  id: string;
  name: string;
}

export interface RelationshipResponse {
  id: string;
  /** ISO date string "YYYY-MM-DD" */
  startDate: string | null;
  isActive: boolean;
  members: RelationshipMemberResponse[];
}

// ─── Partner linking ───────────────────────────────────────────────────────

/** 1 = the current user sent it, 2 = the current user received it. */
export type PartnerLinkDirection = 1 | 2;

export interface PartnerLinkRequestResponse {
  id: string;
  direction: PartnerLinkDirection;
  otherPartyName: string | null;
  otherPartyEmail: string;
  createdAt: string;
  expiresAt: string;
}

export interface PartnerLinkStatusResponse {
  isLinked: boolean;
  partnerName: string | null;
  incomingRequests: PartnerLinkRequestResponse[];
  outgoingRequests: PartnerLinkRequestResponse[];
}

// ─── Notifications / devices ───────────────────────────────────────────────

/** Backend NotificationPlatform enum. */
export type NotificationPlatform = 1 | 2; // 1 = iOS, 2 = Android

export interface RegisterDeviceRequest {
  deviceToken: string;
  platform: NotificationPlatform;
  deviceIdentifier?: string | null;
}

export interface DeviceRegistrationResponse {
  id: string;
  deviceToken: string;
  platform: NotificationPlatform;
  deviceIdentifier: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface NotificationResponse {
  id: string;
  title: string;
  body: string;
  /** e.g. "PartnerLinkRequest" | "PartnerLinkAccepted" | "PartnerLinkDeclined" */
  notificationType: string | null;
  referenceId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ─── Mood / Check-in ─────────────────────────────────────────────────────────

export type MoodType =
  | 'Happy'
  | 'Calm'
  | 'Anxious'
  | 'Sad'
  | 'Angry'
  | 'Overwhelmed'
  | 'Numb'
  | 'Other';

export type CheckInType = 'Morning' | 'Midday' | 'Evening' | 'AdHoc';

export interface CheckInResponse {
  id: string;
  userId: string;
  relationshipId: string;
  checkInType: CheckInType;
  mood: MoodType;
  intensity: number;
  whatHappened: string | null;
  feelings: string | null;
  perceivedCause: string | null;
  whatINeed: string | null;
  isSharedWithPartner: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface MoodSummaryResponse {
  currentMood: MoodType | null;
  currentIntensity: number | null;
  lastCheckInAt: string | null;
  recentCheckIns: CheckInResponse[];
  moodFrequency: Record<string, number>;
}

// ─── Reminders ────────────────────────────────────────────────────────────────

export type ReminderType = 'Medication' | 'Water' | 'Food' | 'Custom';
export type RecurrenceType = 'Daily' | 'Weekdays' | 'Weekends' | 'Weekly' | 'OneTime';

export interface ReminderResponse {
  id: string;
  title: string;
  notes: string | null;
  type: ReminderType;
  /** "HH:MM:SS" */
  reminderTime: string;
  recurrence: RecurrenceType;
  oneTimeDate: string | null;
  isEnabled: boolean;
  lastCompletedAt: string | null;
  snoozeUntil: string | null;
  nextOccurrenceAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// ─── Emergency ───────────────────────────────────────────────────────────────

export type EmergencyRequestStatus = 'Active' | 'Acknowledged' | 'Resolved' | 'Cancelled';

export interface EmergencyRequestResponse {
  id: string;
  requesterId: string;
  relationshipId: string;
  message: string | null;
  status: EmergencyRequestStatus;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

// ─── Hugs ─────────────────────────────────────────────────────────────────────

export interface HugResponse {
  id: string;
  relationshipId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  /** Optional "gentle whisper" the sender attached to the hug. */
  whisper: string | null;
  isAcknowledged: boolean;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface SendHugRequest {
  whisper?: string | null;
}

// ─── Distraction Centre ─────────────────────────────────────────────────────

/** Backend GameType enum, serialized as a string. */
export type GameType =
  | 'QuizAboutUs'
  | 'WouldYouRather'
  | 'MemoryMatch'
  | 'Trivia'
  | 'Game2048'
  | 'HiddenNumber';

/** Backend GameSessionStatus enum, serialized as a string. */
export type GameSessionStatus = 'InProgress' | 'Completed' | 'Abandoned';

export interface GameResponse {
  id: string;
  title: string;
  description: string | null;
  type: GameType;
  isActive: boolean;
}

export interface GameSessionResponse {
  id: string;
  gameId: string;
  gameTitle: string;
  userId: string;
  relationshipId: string;
  status: GameSessionStatus;
  score: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CompleteGameSessionRequest {
  score?: number | null;
}

// ─── Couple Quiz ──────────────────────────────────────────────────────────────

export interface QuizQuestionResponse {
  id: string;
  questionText: string;
  options: string[];
  /** Author's user id, or null for a system question. */
  createdByUserId: string | null;
  /** Author's display name, or null for a system question. */
  createdByName: string | null;
  /** True when the current user authored this question. */
  isMine: boolean;
}

export interface CreateQuizQuestionRequest {
  questionText: string;
  correctAnswer: string;
  options: string[];
}

export interface QuizSessionAnswerResponse {
  questionId: string;
  questionText: string;
  answerGiven: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface QuizSessionResponse {
  id: string;
  score: number;
  totalQuestions: number;
  completedAt: string | null;
  createdAt: string;
  answers: QuizSessionAnswerResponse[];
}

export interface SubmitQuizAnswer {
  questionId: string;
  answerGiven: string;
}

export interface SubmitQuizRequest {
  answers: SubmitQuizAnswer[];
}

// ─── Would You Rather ───────────────────────────────────────────────────────

export interface WouldYouRatherQuestionResponse {
  id: string;
  optionA: string;
  optionB: string;
  /** The current user's choice, if answered. True = Option A. */
  myChoiceIsOptionA: boolean | null;
  /** The partner's choice, if answered. True = Option A. */
  partnerChoiceIsOptionA: boolean | null;
  /** Author's user id, or null for a system prompt. */
  createdByUserId: string | null;
  /** Author's display name, or null for a system prompt. */
  createdByName: string | null;
  /** True when the current user authored this prompt. */
  isMine: boolean;
}

export interface SubmitWouldYouRatherRequest {
  choseOptionA: boolean;
}

export interface CreateWouldYouRatherRequest {
  optionA: string;
  optionB: string;
}

// ─── Hidden Object Puzzles (Spot the Hidden Number/Object) ──────────────────

export interface HiddenObjectPuzzleResponse {
  id: string;
  /** Opaque storage key (persisted). */
  imageFileKey: string;
  /** A loadable image URL resolved from the key (may be presigned). */
  imageUrl: string;
  prompt: string;
  /** Normalised target centre (0–1) within the image. */
  targetX: number;
  targetY: number;
  /** Hit tolerance as a fraction of image size (0–1). */
  targetRadius: number;
  createdByUserId: string;
  createdByName: string | null;
  /** True when the current user authored this puzzle (UI hides the answer). */
  isMine: boolean;
  createdAt: string;
}

export interface CreateHiddenObjectPuzzleRequest {
  imageFileKey: string;
  prompt: string;
  targetX: number;
  targetY: number;
  targetRadius?: number;
}

// ─── Media uploads ──────────────────────────────────────────────────────────

export interface MediaUploadResponse {
  /** Opaque storage key to persist on domain records. */
  fileKey: string;
  /** A URL the client can load the file from (may be presigned / time-limited). */
  url: string;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

/**
 * Backend TimelineEventType enum, serialized as its string name
 * (JsonStringEnumConverter is registered globally on the API).
 */
export type TimelineEventType =
  | 'FirstConversation'
  | 'FirstDate'
  | 'FirstKiss'
  | 'FirstTrip'
  | 'Anniversary'
  | 'Custom';

/** A single timeline-event photo: the storage key plus a loadable URL. */
export interface TimelinePhotoResponse {
  photoKey: string;
  /** A loadable URL for the photo (presigned for S3, static for local). */
  url: string;
}

export interface TimelineEventResponse {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  createdByName: string;
  title: string;
  description: string | null;
  /** ISO date string "YYYY-MM-DD". */
  eventDate: string;
  location: string | null;
  /** Coordinates of the location, for showing the milestone on a map. */
  latitude: number | null;
  longitude: number | null;
  eventType: TimelineEventType;
  /** Raw storage keys. Prefer `photos` which carries loadable URLs. */
  photoKeys: string[];
  /** The event's photos with both the storage key and a loadable URL. */
  photos: TimelinePhotoResponse[];
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateTimelineEventRequest {
  title: string;
  description?: string | null;
  /** ISO date string "YYYY-MM-DD". */
  eventDate: string;
  location?: string | null;
  /** Coordinates of the location, for showing the milestone on a map. */
  latitude?: number | null;
  longitude?: number | null;
  eventType?: TimelineEventType;
  photoKeys?: string[];
}

export interface UpdateTimelineEventRequest {
  title?: string | null;
  description?: string | null;
  /** ISO date string "YYYY-MM-DD". */
  eventDate?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  eventType?: TimelineEventType | null;
}

export interface AddTimelineMediaRequest {
  photoKey: string;
}
