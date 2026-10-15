namespace Amori.Api.Common.Exceptions;

/// <summary>
/// The caller is authenticated but isn't allowed to do this — e.g. editing a
/// partner's memory, or touching a record from another relationship. Maps to
/// HTTP 403.
///
/// Use <see cref="UnauthorizedException"/> (401) only when the caller's
/// identity itself is missing or invalid. The distinction matters to the app:
/// a 401 makes it refresh the session token and retry, which is pointless (and
/// wasteful) for a permission denial.
/// </summary>
public sealed class ForbiddenException(string message = "You don't have permission to do that.")
    : Exception(message);
