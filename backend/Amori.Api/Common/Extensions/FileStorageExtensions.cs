using Amazon.S3;
using Amori.Api.Configuration;
using Amori.Api.Infrastructure.Storage;

namespace Amori.Api.Common.Extensions;

public static class FileStorageExtensions
{
    /// <summary>
    /// Registers the file-storage implementation. Uses AWS S3 when the Aws
    /// configuration section is populated; otherwise falls back to local disk
    /// (served as static files) so uploads work out of the box in development.
    /// </summary>
    public static IServiceCollection AddFileStorage(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();

        var aws = configuration.GetSection(AwsSettings.SectionName).Get<AwsSettings>();
        var useS3 = aws is not null
            && !string.IsNullOrWhiteSpace(aws.Region)
            && !string.IsNullOrWhiteSpace(aws.S3BucketName);

        if (useS3)
        {
            services.AddSingleton<IAmazonS3>(_ =>
            {
                var region = Amazon.RegionEndpoint.GetBySystemName(aws!.Region);
                // Fall back to the default credential chain (env vars, instance
                // role, shared config) when explicit keys aren't provided.
                return string.IsNullOrWhiteSpace(aws.AccessKeyId)
                    ? new AmazonS3Client(region)
                    : new AmazonS3Client(aws.AccessKeyId, aws.SecretAccessKey, region);
            });
            services.AddSingleton<IFileStorageService, S3FileStorageService>();
        }
        else
        {
            services.AddSingleton<IFileStorageService, LocalFileStorageService>();
        }

        return services;
    }
}
