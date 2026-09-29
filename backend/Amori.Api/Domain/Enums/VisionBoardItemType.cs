namespace Amori.Api.Domain.Enums;

/// <summary>
/// The kind of thing a Vision Board item captures. This is a broad "vision"
/// classification (distinct from the actionable Bucket List or the
/// already-happened Memories), used for filtering and badges in the "Us" view.
/// </summary>
public enum VisionBoardItemType
{
    Dream = 1,
    Place = 2,
    Experience = 3,
    Home = 4,
    Future = 5,
    LittleThing = 6,
    Custom = 7,
}
