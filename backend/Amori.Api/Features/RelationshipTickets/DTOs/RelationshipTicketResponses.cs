using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.RelationshipTickets.DTOs;

public sealed class TicketResponseDto
{
    public Guid Id { get; init; }
    public Guid TicketId { get; init; }
    public Guid RespondedByUserId { get; init; }
    public string RespondedByName { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

public sealed class TicketDto
{
    public Guid Id { get; init; }
    public Guid RelationshipId { get; init; }
    public Guid CreatedByUserId { get; init; }
    public string CreatedByName { get; init; } = string.Empty;
    public Guid? AssignedToUserId { get; init; }
    public string? AssignedToName { get; init; }
    public string Subject { get; init; } = string.Empty;
    public TicketCategory Category { get; init; }
    public TicketSeverity Severity { get; init; }
    public TicketStatus Status { get; init; }
    public string? Description { get; init; }
    public string? Feelings { get; init; }
    public string? WhatHappened { get; init; }
    public string? WhatINeed { get; init; }
    public string? WhatIPreferInFuture { get; init; }
    public string? AdditionalNotes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public DateTime? ResolvedAt { get; init; }
    public IReadOnlyList<TicketResponseDto> Responses { get; init; } = [];
}
