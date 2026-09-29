using System.Text;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.LetsChat.DTOs;

namespace Amori.Api.Features.LetsChat.Services;

/// <summary>
/// Flattens a template's answers into the composed sentence, using the same
/// prompt prefixes the client shows in the guided flow. Kept server-side so a
/// sent message always has a canonical composition regardless of what the
/// client sent.
/// </summary>
public static class ChatComposer
{
    /// <summary>
    /// Build the composed sentence for <paramref name="type"/> from
    /// <paramref name="answers"/>. Steps with no answer are skipped so a partial
    /// draft still composes cleanly. Whitespace is trimmed on every answer.
    /// </summary>
    public static string Compose(ChatTemplateType type, IReadOnlyDictionary<string, string> answers)
    {
        var template = ChatTemplates.Find(type);
        if (template is null) return string.Empty;

        var sb = new StringBuilder();
        foreach (var step in template.Steps)
        {
            if (!answers.TryGetValue(step.Input, out var raw)) continue;
            var value = raw?.Trim();
            if (string.IsNullOrEmpty(value)) continue;

            if (sb.Length > 0) sb.Append(' ');
            // The free-form single-step template already reads as a full sentence
            // via its prefix ("Something on my mind is …"), so prefixes are always
            // prepended — matching the client preview.
            if (!string.IsNullOrEmpty(step.Prefix))
            {
                sb.Append(step.Prefix);
                sb.Append(' ');
            }
            sb.Append(value);
        }

        var composed = sb.ToString().Trim();
        // Terminal punctuation if the author didn't add their own.
        if (composed.Length > 0 && !EndsWithPunctuation(composed))
            composed += ".";
        return composed;
    }

    /// <summary>
    /// The template inputs that must be non-empty before a message can be sent.
    /// (All steps flagged Required in the catalog.)
    /// </summary>
    public static IReadOnlyList<string> RequiredInputs(ChatTemplateType type) =>
        ChatTemplates.Find(type)?.Steps.Where(s => s.Required).Select(s => s.Input).ToList()
            ?? new List<string>();

    private static bool EndsWithPunctuation(string s)
    {
        var last = s[^1];
        return last is '.' or '!' or '?' or '…';
    }
}
