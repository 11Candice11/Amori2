using Amori.Api.Data.Context;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Testcontainers.PostgreSql;
using Xunit;

namespace Amori.Api.Tests;

/// <summary>
/// Shared fixture that starts one Postgres container per test class
/// and wires the DbContext to point at it.
/// Implements IAsyncLifetime so xUnit calls InitializeAsync before
/// any test constructor runs.
/// </summary>
public sealed class AmoriWebApplicationFactory
    : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    // Called by xUnit before any test in the class that uses this fixture.
    public async Task InitializeAsync()
    {
        await _db.StartAsync();

        // Program.cs builds its configuration from environment variables and
        // validates Database:ConnectionString while the host is built (before
        // the DbContext swap in ConfigureWebHost runs). The container's
        // connection string isn't known until it's started, so publish it as an
        // environment variable now — the double underscore maps to the
        // "Database:ConnectionString" config key. The DbContext is still
        // re-registered below to enable dynamic JSON.
        Environment.SetEnvironmentVariable(
            "Database__ConnectionString", _db.GetConnectionString());

        // JWT settings are validated at host build too, and the checked-in
        // appsettings ships an empty SecretKey (real secrets are injected from
        // the environment in deployed environments). Supply a test signing key
        // so token issuance/validation works during integration tests.
        Environment.SetEnvironmentVariable(
            "Jwt__SecretKey", "amori-integration-test-signing-key-please-change-32+chars");
    }

    public new async Task DisposeAsync()
    {
        await _db.StopAsync();
        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove the real DbContext registration coming from Program.cs.
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AmoriDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            // Also remove the DbContext itself so EF doesn't complain about
            // a duplicate registration in some SDK versions.
            var ctxDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(AmoriDbContext));
            if (ctxDescriptor != null)
                services.Remove(ctxDescriptor);

            // Register against the test container – _db is already started
            // because InitializeAsync ran before ConfigureWebHost.
            // EnableDynamicJson mirrors production (DatabaseExtensions) so JSONB
            // columns backed by List<T>/complex types serialize correctly.
            var dataSource = new NpgsqlDataSourceBuilder(_db.GetConnectionString())
                .EnableDynamicJson()
                .Build();
            services.AddDbContext<AmoriDbContext>(options =>
                options.UseNpgsql(dataSource));
        });

        builder.UseEnvironment("Testing");
    }

    /// <summary>
    /// Applies EF migrations (or EnsureCreated) so the schema is ready.
    /// Call this once per fixture before the first request.
    /// </summary>
    public async Task EnsureDatabaseCreatedAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AmoriDbContext>();
        await db.Database.EnsureCreatedAsync();
    }
}
