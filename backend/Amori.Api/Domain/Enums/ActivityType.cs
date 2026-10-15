namespace Amori.Api.Domain.Enums;

/// <summary>
/// Enum for the types of activities that can award points.
/// Maps to the point values defined in the Points system.
/// </summary>
public enum ActivityType
{
    /// <summary>User sent a hug (10 points).</summary>
    HugSent = 1,

    /// <summary>User held/acknowledged a hug (5 points).</summary>
    HugHeld = 2,

    /// <summary>User added a vision board item (10 points).</summary>
    VisionAdded = 3,

    /// <summary>User added a todo list item (10 points).</summary>
    TodoAdded = 4,

    /// <summary>User added a bucket list item (10 points).</summary>
    BucketListAdded = 5,

    /// <summary>User completed morning check-in (10 points, once per day).</summary>
    MorningCheckIn = 6,

    /// <summary>User completed SOS/emergency flow (20 points).</summary>
    SosFlowCompleted = 7,

    /// <summary>User opened their daily gift (15 points).</summary>
    DailyGiftOpened = 8,

    /// <summary>User collected a card (variable: cardNumber × 15 points).</summary>
    CardCollected = 9,

    /// <summary>Manual points adjustment (admin use).</summary>
    ManualAdjustment = 10,
}
