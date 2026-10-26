using Amori.Api.Common.Exceptions;

namespace Amori.Api.Common.Text;

/// <summary>Small rules shared by features that accept free-text fields from the app.</summary>
public static class UserInput
{
    /// <summary>Trims the value; a blank value becomes null (so "clear this field" stores nothing).</summary>
    public static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>The largest amount a numeric(10,2) money column can hold.</summary>
    public const decimal MaxMoney = 99_999_999.99m;

    /// <summary>
    /// Null stays null. Otherwise the amount must be 0 to <see cref="MaxMoney"/> (0 means free) and is
    /// rounded half-up to cents, so a bad value is a 422 rather than a database overflow.
    /// </summary>
    public static decimal? ValidMoney(decimal? amount, string label)
    {
        if (!amount.HasValue) return null;
        if (amount.Value < 0 || amount.Value > MaxMoney)
            throw new ValidationException($"{label} must be between 0 and 99,999,999.99.");
        // Round half up (12.345 -> 12.35), not the default banker's rounding.
        return decimal.Round(amount.Value, 2, MidpointRounding.AwayFromZero);
    }

    /// <summary>
    /// Blank clears the link. Anything else must be an absolute http(s) URL, since
    /// the partner's app opens it when tapped (so a stored link can't launch another app).
    /// </summary>
    public static string? NormalizeLink(string? value)
    {
        var trimmed = NullIfBlank(value);
        if (trimmed is null) return null;
        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            throw new ValidationException("Link must be a valid http or https address.");
        return trimmed;
    }
}
