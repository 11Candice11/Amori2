namespace Amori.Api.Features.Media.DTOs;

/// <summary>Result of uploading a file — the storage key plus a fetchable URL.</summary>
public sealed class MediaUploadResponse
{
    /// <summary>Opaque storage key to persist on domain records.</summary>
    public string FileKey { get; init; } = string.Empty;

    /// <summary>A URL the client can load the file from (may be presigned / time-limited).</summary>
    public string Url { get; init; } = string.Empty;
}
