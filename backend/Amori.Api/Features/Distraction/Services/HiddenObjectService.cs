using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Features.Distraction.DTOs;
using Amori.Api.Infrastructure.Relationships;
using Amori.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace Amori.Api.Features.Distraction.Services;

public sealed class HiddenObjectService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess,
    IFileStorageService storage) : IHiddenObjectService
{
    public async Task<IReadOnlyList<HiddenObjectPuzzleResponse>> GetPuzzlesAsync(Guid userId, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        var puzzles = await db.HiddenObjectPuzzles
            .Include(p => p.CreatedBy)
            .Where(p => p.RelationshipId == rel.Id && p.IsActive)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);

        return puzzles.Select(p => MapPuzzle(p, userId)).ToList();
    }

    public async Task<HiddenObjectPuzzleResponse> CreatePuzzleAsync(Guid userId, CreateHiddenObjectPuzzleRequest request, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        var imageKey = request.ImageFileKey?.Trim() ?? string.Empty;
        var prompt = request.Prompt?.Trim() ?? string.Empty;
        if (imageKey.Length == 0) throw new ValidationException("An image is required.");
        if (prompt.Length == 0) throw new ValidationException("Tell your partner what to look for.");
        if (request.TargetX is < 0 or > 1 || request.TargetY is < 0 or > 1)
            throw new ValidationException("The target must be inside the image.");

        var radius = request.TargetRadius ?? 0.08;
        if (radius is <= 0 or > 0.5) radius = 0.08;

        var puzzle = new HiddenObjectPuzzle
        {
            RelationshipId = rel.Id,
            CreatedByUserId = userId,
            ImageFileKey = imageKey,
            Prompt = prompt,
            TargetX = request.TargetX,
            TargetY = request.TargetY,
            TargetRadius = radius,
            IsActive = true,
        };
        db.HiddenObjectPuzzles.Add(puzzle);
        await db.SaveChangesAsync(ct);

        puzzle.CreatedBy = (await db.Users.FindAsync([userId], ct))!;
        return MapPuzzle(puzzle, userId);
    }

    public async Task DeletePuzzleAsync(Guid userId, Guid puzzleId, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        var puzzle = await db.HiddenObjectPuzzles
            .FirstOrDefaultAsync(p => p.Id == puzzleId, ct)
            ?? throw new NotFoundException("Hidden object puzzle", puzzleId);

        if (puzzle.RelationshipId != rel.Id) throw new UnauthorizedException();
        if (puzzle.CreatedByUserId != userId)
            throw new UnauthorizedException("Only the creator can delete this puzzle.");

        db.HiddenObjectPuzzles.Remove(puzzle);
        await db.SaveChangesAsync(ct);
    }

    private HiddenObjectPuzzleResponse MapPuzzle(HiddenObjectPuzzle p, Guid userId) => new()
    {
        Id = p.Id,
        ImageFileKey = p.ImageFileKey,
        ImageUrl = storage.GetPublicUrl(p.ImageFileKey),
        Prompt = p.Prompt,
        TargetX = p.TargetX,
        TargetY = p.TargetY,
        TargetRadius = p.TargetRadius,
        CreatedByUserId = p.CreatedByUserId,
        CreatedByName = p.CreatedBy?.DisplayName,
        IsMine = p.CreatedByUserId == userId,
        CreatedAt = p.CreatedAt,
    };
}
