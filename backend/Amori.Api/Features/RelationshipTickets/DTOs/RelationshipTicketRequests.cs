using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.RelationshipTickets.DTOs;

public sealed class CreateTicketRequest
{
    public string Subject { get; set; } = string.Empty;
    public TicketCategory Category { get; set; }
    public TicketSeverity Severity { get; set; } = TicketSeverity.Medium;
    public string? Description { get; set; }
    public string? Feelings { get; set; }
    public string? WhatHappened { get; set; }
    public string? WhatINeed { get; set; }
    public string? WhatIPreferInFuture { get; set; }
    public string? AdditionalNotes { get; set; }
}

public sealed class UpdateTicketRequest
{
    public string? Subject { get; set; }
    public TicketCategory? Category { get; set; }
    public TicketSeverity? Severity { get; set; }
    public string? Description { get; set; }
    public string? Feelings { get; set; }
    public string? WhatHappened { get; set; }
    public string? WhatINeed { get; set; }
    public string? WhatIPreferInFuture { get; set; }
    public string? AdditionalNotes { get; set; }
}

public sealed class AddTicketResponseRequest
{
    public string Content { get; set; } = string.Empty;
}

public sealed class AssignTicketRequest
{
    public Guid AssignedToUserId { get; set; }
}
