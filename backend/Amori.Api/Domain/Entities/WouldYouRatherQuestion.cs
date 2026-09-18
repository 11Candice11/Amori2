namespace Amori.Api.Domain.Entities;

public sealed class WouldYouRatherQuestion : BaseEntity
{
    /// <summary>Owning couple. Null = global prompt available to everyone.</summary>
    public Guid? RelationshipId { get; set; }
    /// <summary>The partner who authored this prompt. Null = system/global prompt.</summary>
    public Guid? CreatedByUserId { get; set; }
    public string OptionA { get; set; } = string.Empty;
    public string OptionB { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    // Navigation
    public Relationship? Relationship { get; set; }
    public User? CreatedBy { get; set; }
    public ICollection<WouldYouRatherAnswer> Answers { get; set; } = [];
}
