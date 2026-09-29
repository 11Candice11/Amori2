using Amori.Api.Features.VisionBoard.DTOs;

namespace Amori.Api.Features.VisionBoard.Services;

public interface IVisionBoardService
{
    // Board
    Task<VisionBoardResponse> GetBoardAsync(Guid userId, CancellationToken ct = default);

    // Items
    Task<VisionBoardItemResponse> GetItemAsync(Guid userId, Guid itemId, CancellationToken ct = default);
    Task<VisionBoardItemResponse> CreateItemAsync(Guid userId, CreateVisionBoardItemRequest request, CancellationToken ct = default);
    Task<VisionBoardItemResponse> UpdateItemAsync(Guid userId, Guid itemId, UpdateVisionBoardItemRequest request, CancellationToken ct = default);
    Task DeleteItemAsync(Guid userId, Guid itemId, CancellationToken ct = default);
    Task<VisionBoardItemResponse> CompleteItemAsync(Guid userId, Guid itemId, CompleteVisionBoardItemRequest request, CancellationToken ct = default);
    Task<VisionBoardItemResponse> UncompleteItemAsync(Guid userId, Guid itemId, CancellationToken ct = default);
    Task<VisionBoardItemResponse> MoveItemAsync(Guid userId, Guid itemId, MoveVisionBoardItemRequest request, CancellationToken ct = default);
    Task<VisionBoardItemResponse> SetPinnedAsync(Guid userId, Guid itemId, PinVisionBoardItemRequest request, CancellationToken ct = default);
    Task ReorderItemsAsync(Guid userId, ReorderVisionBoardItemsRequest request, CancellationToken ct = default);

    // Sections
    Task<IReadOnlyList<VisionBoardSectionResponse>> GetSectionsAsync(Guid userId, CancellationToken ct = default);
    Task<VisionBoardSectionResponse> CreateSectionAsync(Guid userId, CreateVisionBoardSectionRequest request, CancellationToken ct = default);
    Task<VisionBoardSectionResponse> UpdateSectionAsync(Guid userId, Guid sectionId, UpdateVisionBoardSectionRequest request, CancellationToken ct = default);
    Task DeleteSectionAsync(Guid userId, Guid sectionId, CancellationToken ct = default);
    Task ReorderSectionsAsync(Guid userId, ReorderVisionBoardSectionsRequest request, CancellationToken ct = default);
}
