using System.Text.Json.Serialization;
using Amori.Api.Common.Extensions;
using Amori.Api.Common.Middleware;
using Amori.Api.Configuration;
using Amori.Api.Data.Context;
using Amori.Api.Data.Seed;
using Amori.Api.Infrastructure.Storage;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// ── Configuration ─────────────────────────────────────────────────────────────
builder.Services.Configure<AwsSettings>(
    builder.Configuration.GetSection(AwsSettings.SectionName));
builder.Services.Configure<NotificationSettings>(
    builder.Configuration.GetSection(NotificationSettings.SectionName));

// ── Core services ─────────────────────────────────────────────────────────────
builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        // Serialize enums as their string names (e.g. "Open", "Communication")
        // so the mobile client receives stable string values instead of integers.
        // JsonStringEnumConverter still accepts integer input on deserialization,
        // so clients may send either the numeric or string form.
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDatabase(builder.Configuration);

// ── Authentication / JWT ──────────────────────────────────────────────────────
builder.Services.AddJwtAuthentication(builder.Configuration);

// ── Application services ──────────────────────────────────────────────────────
builder.Services.AddApplicationServices();

// ── File storage (S3 in prod, local disk fallback in dev) ─────────────────────
builder.Services.AddFileStorage(builder.Configuration);

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddAmoriCors(builder.Configuration);

// ── Swagger ───────────────────────────────────────────────────────────────────
builder.Services.AddSwagger();

// ── Health Checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ── Forwarded headers (reverse proxy / TLS termination) ───────────────────────
// nginx terminates TLS and reverse-proxies to the API over plain HTTP, so the
// incoming Request.Scheme is "http". Without honouring X-Forwarded-Proto, any
// URL the API builds from Request.Scheme/Host (notably LocalFileStorageService's
// public upload URLs) comes out as "http://…", which the mobile client can't
// load — iOS ATS blocks cleartext and RN's <Image> won't follow the 301→https
// redirect, so uploaded photos silently fail to render. Trust the proxy's
// X-Forwarded-Proto/-Host so Request.Scheme becomes "https".
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;
    // The proxy is on the same host/network and not enumerable here; clearing the
    // known-networks/proxies lists tells the middleware to trust the immediate
    // forwarder. Safe because nginx is the only ingress in front of the API.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ── Local uploads folder ──────────────────────────────────────────────────────
// Must exist before the static-file provider is built: if wwwroot is missing at
// startup ASP.NET resolves it to a NullFileProvider, so files written later by
// LocalFileStorageService would 404 (uploaded images never load) until restart.
var uploadsRoot = Path.Combine(
    builder.Environment.ContentRootPath,
    "wwwroot",
    LocalFileStorageService.UploadsFolder);
Directory.CreateDirectory(uploadsRoot);

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────
// Apply forwarded headers first so Request.Scheme/Host reflect the original
// client request (https via nginx) for everything downstream — including the
// upload URLs built by LocalFileStorageService.
app.UseForwardedHeaders();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwaggerWithUi();
}

// Serve locally-stored uploads (used by LocalFileStorageService) from an
// explicit provider rooted at the uploads folder, so serving does not depend on
// wwwroot existing when the host was created.
var uploadContentTypes = new FileExtensionContentTypeProvider();
uploadContentTypes.Mappings[".heic"] = "image/heic";
uploadContentTypes.Mappings[".heif"] = "image/heif";
uploadContentTypes.Mappings[".webp"] = "image/webp";

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsRoot),
    RequestPath = $"/{LocalFileStorageService.UploadsFolder}",
    ContentTypeProvider = uploadContentTypes,
});

app.UseHttpsRedirection();

app.UseCors(Amori.Api.Configuration.CorsSettings.PolicyName);
app.UseAuthentication();
app.UseAuthorization();

// Resolve the caller's local date once, after authentication so the warning
// logged for an implausible date can name the user. Day-based rules (daily
// points, streaks) read it from IClientLocalTimeAccessor.
app.UseMiddleware<ClientLocalTimeMiddleware>();

app.MapControllers();
app.MapHealthChecks("/api/healthz");

// ── Auto-migrate and seed ─────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AmoriDbContext>();
    await db.Database.MigrateAsync();
    await AmoriDbSeeder.SeedAsync(db);
}

app.Run();

// Needed for integration test WebApplicationFactory
public partial class Program { }
