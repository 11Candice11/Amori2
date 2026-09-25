using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Media.DTOs;
using Amori.Api.Infrastructure.Authentication;
using Amori.Api.Infrastructure.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Media.Controllers;

/// <summary>
/// Generic authenticated media uploads. The client uploads a file here and
/// receives a storage key + URL to attach to a domain record (memories,
/// hidden-object puzzles, etc.).
/// </summary>
[ApiController]
[Route("api/media")]
[Authorize]
public sealed class MediaController(
    IFileStorageService storage,
    ICurrentUserService currentUser) : ControllerBase
{
    // 100 MB — comfortably covers a compressed short clip (TikTok-length, ≤60s)
    // while still bounding abuse. Keep this in sync with the RequestSizeLimit
    // literal on Upload (attributes require a compile-time constant).
    private const long MaxBytes = 100 * 1024 * 1024; // 100 MB

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        // Images
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
        "image/gif",
        // Audio (voice notes). expo-av records m4a/aac on both platforms; the
        // others are accepted so a variety of client encoders round-trip.
        "audio/m4a",
        "audio/x-m4a",
        "audio/mp4",
        "audio/aac",
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/webm",
        "audio/ogg",
        // Video (short clips). iOS records .mov (quicktime); Android records
        // mp4. The others cover common client encoders.
        "video/mp4",
        "video/quicktime",
        "video/webm",
        "video/3gpp",
        "video/x-matroska",
    };

    /// <summary>Upload an image, audio, or video file. Multipart form field name: <c>file</c>.</summary>
    [HttpPost]
    [RequestSizeLimit(100 * 1024 * 1024)] // keep in sync with MaxBytes
    [ProducesResponseType(typeof(MediaUploadResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Upload(IFormFile? file, CancellationToken ct)
    {
        _ = currentUser.UserId ?? throw new UnauthorizedException();

        if (file is null || file.Length == 0)
            throw new ValidationException("A file is required.");
        if (file.Length > MaxBytes)
            throw new ValidationException("The file is too large (max 100 MB).");
        if (!AllowedContentTypes.Contains(file.ContentType))
            throw new ValidationException("Only image, audio, and video uploads are supported.");

        await using var stream = file.OpenReadStream();
        var key = await storage.UploadAsync(stream, file.FileName, file.ContentType, ct);
        var url = storage.GetPublicUrl(key);

        return StatusCode(StatusCodes.Status201Created, new MediaUploadResponse
        {
            FileKey = key,
            Url = url,
        });
    }
}
