namespace Amori.Api.Common.Exceptions;

/// <summary>
/// The caller's identity is missing or invalid (bad credentials, bad or expired
/// token). Maps to HTTP 401, which makes the app refresh its session and retry.
/// For "signed in but not allowed", throw <see cref="ForbiddenException"/>.
/// </summary>
public sealed class UnauthorizedException(string message = "You are not authorized to perform this action.")
    : Exception(message);
