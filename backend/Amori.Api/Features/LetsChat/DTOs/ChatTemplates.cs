using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.LetsChat.DTOs;

/// <summary>
/// The static catalog of guided "Let's Chat" templates, served from
/// <c>GET /api/chat/templates</c>. The definitions live server-side so the set
/// of templates (and their prompts) can evolve without shipping a new app, and
/// so the server can re-compose a message from raw answers consistently with
/// the client preview.
/// </summary>
public static class ChatTemplates
{
    /// <summary>One ordered prompt step within a template.</summary>
    public sealed class ChatTemplateStep
    {
        public required string Input { get; init; }
        public required string Label { get; init; }
        /// <summary>Sentence fragment shown before the answer, e.g. "I feel".</summary>
        public required string Prefix { get; init; }
        public string? Placeholder { get; init; }
        /// <summary>Required steps block an empty submission; optional ones don't.</summary>
        public bool Required { get; init; } = true;
        /// <summary>Multiline (free-form) vs single-line input hint for the client.</summary>
        public bool Multiline { get; init; }
    }

    public sealed class ChatTemplateDefinition
    {
        public required ChatTemplateType Type { get; init; }
        public required string Title { get; init; }
        public required string Description { get; init; }
        public required IReadOnlyList<ChatTemplateStep> Steps { get; init; }
    }

    public static readonly IReadOnlyList<ChatTemplateDefinition> All = new List<ChatTemplateDefinition>
    {
        new()
        {
            Type = ChatTemplateType.Feeling,
            Title = "Something I'm feeling",
            Description = "Put words to what is here for you right now, and how it came about.",
            Steps = new List<ChatTemplateStep>
            {
                new() { Input = "feeling",   Label = "How are you feeling?",         Prefix = "I feel",        Placeholder = "vulnerable, a little overwhelmed…" },
                new() { Input = "situation", Label = "What brought this feeling up?", Prefix = "because of",    Placeholder = "the conversation we had yesterday…", Multiline = true },
                new() { Input = "need",      Label = "What did you need?",            Prefix = "and I needed",  Placeholder = "a moment of gentle reassurance…" },
            },
        },
        new()
        {
            Type = ChatTemplateType.Appreciation,
            Title = "Something I appreciate",
            Description = "Celebrate the good, gentle ways they make your life sweeter and richer.",
            Steps = new List<ChatTemplateStep>
            {
                new() { Input = "person", Label = "Who or what do you appreciate?", Prefix = "I appreciate", Placeholder = "you…" },
                new() { Input = "action", Label = "What did they do?",              Prefix = "because",      Placeholder = "you brought me tea without asking…", Multiline = true },
                new() { Input = "reason", Label = "Why did it matter to you?",      Prefix = "and it meant", Placeholder = "I felt seen and cared for…",         Multiline = true },
            },
        },
        new()
        {
            Type = ChatTemplateType.Need,
            Title = "Something I need",
            Description = "Express a tender longing or gentle request as a simple reassurance.",
            Steps = new List<ChatTemplateStep>
            {
                new() { Input = "need",   Label = "What do you need right now?", Prefix = "Right now I need", Placeholder = "some quiet time together…" },
                new() { Input = "reason", Label = "Why do you need it?",         Prefix = "because",          Placeholder = "the week has been a lot…", Multiline = true },
            },
        },
        new()
        {
            Type = ChatTemplateType.SomethingBotheredMe,
            Title = "Something that bothered me",
            Description = "Share what bothered you, and open it up with tenderness, not blame.",
            Steps = new List<ChatTemplateStep>
            {
                new() { Input = "situation",      Label = "What bothered you?",          Prefix = "Something that bothered me was", Placeholder = "when plans changed at the last minute…", Multiline = true },
                new() { Input = "feeling",        Label = "How did it make you feel?",   Prefix = "I felt",                          Placeholder = "unimportant…" },
                new() { Input = "desiredOutcome", Label = "What would you like?",        Prefix = "and I would like",                Placeholder = "us to check in before deciding…",       Multiline = true },
            },
        },
        new()
        {
            Type = ChatTemplateType.SomethingOnMyMind,
            Title = "Just something on my mind",
            Description = "An open, unhurried thought to share in your own words.",
            Steps = new List<ChatTemplateStep>
            {
                new() { Input = "thought", Label = "Something on my mind is…", Prefix = "Something on my mind is", Placeholder = "I've been thinking about…", Multiline = true },
            },
        },
        new()
        {
            Type = ChatTemplateType.Future,
            Title = "Something about our future",
            Description = "Dream, plan, and gently look ahead to what lies ahead for both of you.",
            Steps = new List<ChatTemplateStep>
            {
                new() { Input = "goal",   Label = "What would you love for us to do?", Prefix = "I would love for us to", Placeholder = "take a trip to the coast…", Multiline = true },
                new() { Input = "reason", Label = "Why does it matter?",               Prefix = "because",                Placeholder = "I want us to have something to look forward to…", Multiline = true },
            },
        },
    };

    public static ChatTemplateDefinition? Find(ChatTemplateType type) =>
        All.FirstOrDefault(t => t.Type == type);
}
