using Amazon.S3;
using Amazon.S3.Model;
using Amori.Api.Configuration;
using Microsoft.Extensions.Options;

namespace Amori.Api.Infrastructure.Storage;

/// <summary>
/// AWS S3-backed file storage. Uploads under an <c>uploads/</c> prefix and
/// returns time-limited presigned GET URLs so the bucket can stay private.
/// </summary>
public sealed class S3FileStorageService : IFileStorageService
{
    private const string KeyPrefix = "uploads/";
    private static readonly TimeSpan UrlLifetime = TimeSpan.FromDays(7);

    private readonly IAmazonS3 _s3;
    private readonly string _bucket;

    public S3FileStorageService(IAmazonS3 s3, IOptions<AwsSettings> options)
    {
        _s3 = s3;
        _bucket = options.Value.S3BucketName;
    }

    public async Task<string> UploadAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(fileName);
        var key = $"{KeyPrefix}{Guid.NewGuid():N}{extension}";

        var request = new PutObjectRequest
        {
            BucketName = _bucket,
            Key = key,
            InputStream = fileStream,
            ContentType = contentType,
            DisablePayloadSigning = false,
        };

        await _s3.PutObjectAsync(request, cancellationToken);
        return key;
    }

    public async Task DeleteAsync(string fileKey, CancellationToken cancellationToken = default)
    {
        await _s3.DeleteObjectAsync(new DeleteObjectRequest
        {
            BucketName = _bucket,
            Key = fileKey,
        }, cancellationToken);
    }

    public string GetPublicUrl(string fileKey)
    {
        // Pass through anything that's already an absolute URL.
        if (fileKey.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            fileKey.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return fileKey;
        }

        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucket,
            Key = fileKey,
            Expires = DateTime.UtcNow.Add(UrlLifetime),
            Verb = HttpVerb.GET,
        };

        return _s3.GetPreSignedURL(request);
    }
}
