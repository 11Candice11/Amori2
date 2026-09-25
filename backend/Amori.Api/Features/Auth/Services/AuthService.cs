using Amori.Api.Common.Exceptions;
using Amori.Api.Configuration;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.Auth.DTOs;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Amori.Api.Features.Auth.Services;

public sealed class AuthService(
    AmoriDbContext db,
    IJwtTokenService jwtTokenService,
    IPasswordHasher passwordHasher,
    IOptions<JwtSettings> jwtOptions,
    ILogger<AuthService> logger) : IAuthService
{
    private readonly JwtSettings _jwt = jwtOptions.Value;

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        ValidateRegister(request);

        var email = request.Email.Trim().ToLowerInvariant();

        if (await db.Users.AnyAsync(u => u.Email == email, ct))
            throw new ConflictException($"User with email '{request.Email}' already exists.");

        var user = new User
        {
            Email = email,
            PasswordHash = passwordHasher.Hash(request.Password),
            DisplayName = request.Name.Trim(),
            Status = UserStatus.Active
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("User registered: {UserId}", user.Id);

        return await BuildResponseAsync(user, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        ValidateLogin(request);

        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        if (user == null || !passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid email or password.");

        if (user.Status != UserStatus.Active)
            throw new UnauthorizedException("User account is not active.");

        logger.LogInformation("User logged in: {UserId}", user.Id);

        return await BuildResponseAsync(user, ct);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            throw new UnauthorizedException("Refresh token is required.");

        var stored = await db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == request.RefreshToken, ct);

        // Unknown token — reject.
        if (stored == null)
            throw new UnauthorizedException("Invalid refresh token.");

        // Reuse of an already-revoked token is a red flag: revoke the whole
        // chain for that user so a stolen token can't be replayed.
        if (stored.IsRevoked)
        {
            logger.LogWarning(
                "Revoked refresh token reused for user {UserId}; revoking all tokens.",
                stored.UserId);
            await RevokeAllForUserAsync(stored.UserId, "Reuse of revoked token detected.", ct);
            await db.SaveChangesAsync(ct);
            throw new UnauthorizedException("Invalid refresh token.");
        }

        if (stored.ExpiresAt <= DateTime.UtcNow)
            throw new UnauthorizedException("Refresh token has expired.");

        if (stored.User.Status != UserStatus.Active)
            throw new UnauthorizedException("User account is not active.");

        // Rotate: issue a new refresh token and retire the old one, linking them
        // so a reuse of the old token can be detected above.
        var newRefresh = CreateRefreshToken(stored.UserId);
        stored.IsRevoked = true;
        stored.RevokedReason = "Rotated on refresh.";
        stored.ReplacedByToken = newRefresh.Token;
        stored.UpdatedAt = DateTime.UtcNow;

        db.RefreshTokens.Add(newRefresh);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Access token refreshed for user {UserId}", stored.UserId);

        return BuildResponse(stored.User, newRefresh.Token);
    }

    public async Task LogoutAsync(RefreshRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return; // Nothing to revoke — treat as a no-op.

        var stored = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == request.RefreshToken, ct);

        if (stored == null || stored.IsRevoked)
            return; // Already gone / already revoked.

        stored.IsRevoked = true;
        stored.RevokedReason = "Signed out.";
        stored.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("User signed out, refresh token revoked: {UserId}", stored.UserId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>Issues a fresh access token and a newly-persisted refresh token.</summary>
    private async Task<AuthResponse> BuildResponseAsync(User user, CancellationToken ct)
    {
        var refresh = CreateRefreshToken(user.Id);
        db.RefreshTokens.Add(refresh);
        await db.SaveChangesAsync(ct);
        return BuildResponse(user, refresh.Token);
    }

    private AuthResponse BuildResponse(User user, string refreshToken) => new()
    {
        AccessToken = jwtTokenService.GenerateAccessToken(user),
        RefreshToken = refreshToken,
        AccessTokenExpiresAt = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes),
        User = new UserResponse { Id = user.Id, Name = user.DisplayName, Email = user.Email }
    };

    private RefreshToken CreateRefreshToken(Guid userId) => new()
    {
        UserId = userId,
        Token = jwtTokenService.GenerateRefreshToken(),
        ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays),
        IsRevoked = false
    };

    private async Task RevokeAllForUserAsync(Guid userId, string reason, CancellationToken ct)
    {
        var active = await db.RefreshTokens
            .Where(t => t.UserId == userId && !t.IsRevoked)
            .ToListAsync(ct);

        foreach (var token in active)
        {
            token.IsRevoked = true;
            token.RevokedReason = reason;
            token.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static void ValidateRegister(RegisterRequest req)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(req.Name)) errors.Add("Name is required.");
        if (string.IsNullOrWhiteSpace(req.Email)) errors.Add("Email is required.");
        else if (!IsValidEmail(req.Email)) errors.Add("Email format is invalid.");
        if (string.IsNullOrWhiteSpace(req.Password)) errors.Add("Password is required.");
        else if (req.Password.Length < 8) errors.Add("Password must be at least 8 characters.");
        if (errors.Count > 0) throw new Common.Exceptions.ValidationException(errors);
    }

    private static void ValidateLogin(LoginRequest req)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(req.Email)) errors.Add("Email is required.");
        if (string.IsNullOrWhiteSpace(req.Password)) errors.Add("Password is required.");
        if (errors.Count > 0) throw new Common.Exceptions.ValidationException(errors);
    }

    private static bool IsValidEmail(string email)
    {
        try { var a = new System.Net.Mail.MailAddress(email); return a.Address == email; }
        catch { return false; }
    }
}
