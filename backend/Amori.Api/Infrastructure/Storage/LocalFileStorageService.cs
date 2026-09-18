using Microsoft.AspNetCore.Http;

namespace Amori.Api.Infrastructure.Storage;

/// <summary>
/// Development / self-hosted fallback storage. Writes uploads to
/// <c>wwwroot/uploads</c> so they can be served as static files by the API.
/// Used automatically when AWS S3 is not configured.
/// </summary>
public sealed class LocalFileStorageService : IFileStorageService
{
    /// <summary>Sub-folder under wwwroot that holds uploads.</summary>
    public const string UploadsFolder = "uploads";

    private readonly string _rootPath;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public LocalFileStorageService(IWebHostEnvironment env, IHttpContextAccessor httpContextAccessor)
    {
        // WebRootPath can be null if wwwroot doesn't exist yet — fall back to ContentRoot/wwwroot.
        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        _rootPath = Path.Combine(webRoot, UploadsFolder);
        Directory.CreateDirectory(_rootPath);
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<string> UploadAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(fileName);
        var key = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(_rootPath, key);

        await using (var output = File.Create(fullPath))
        {
            await fileStream.CopyToAsync(output, cancellationToken);
        }

        return key;
    }

    public Task DeleteAsync(string fileKey, CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(_rootPath, SanitizeKey(fileKey));
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public string GetPublicUrl(string fileKey)
    {
        // Already an absolute URL? Return as-is (older records may store full URLs).
        if (fileKey.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            fileKey.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return fileKey;
        }

        var relative = $"/{UploadsFolder}/{SanitizeKey(fileKey)}";

        var request = _httpContextAccessor.HttpContext?.Request;
        if (request is null) return relative;

        return $"{request.Scheme}://{request.Host}{relative}";
    }

    /// <summary>Strip any path segments so a key can't escape the uploads folder.</summary>
    private static string SanitizeKey(string fileKey) => Path.GetFileName(fileKey);
}
