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
    private const long MaxBytes = 10 * 1024 * 1024; // 10 MB

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
        "image/gif",
    };

    /// <summary>Upload an image. Multipart form field name: <c>file</c>.</summary>
    [HttpPost]
    [RequestSizeLimit(MaxBytes)]
    [ProducesResponseType(typeof(MediaUploadResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Upload(IFormFile? file, CancellationToken ct)
    {
        _ = currentUser.UserId ?? throw new UnauthorizedException();

        if (file is null || file.Length == 0)
            throw new ValidationException("A file is required.");
        if (file.Length > MaxBytes)
            throw new ValidationException("The file is too large (max 10 MB).");
        if (!AllowedContentTypes.Contains(file.ContentType))
            throw new ValidationException("Only image uploads are supported.");

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
