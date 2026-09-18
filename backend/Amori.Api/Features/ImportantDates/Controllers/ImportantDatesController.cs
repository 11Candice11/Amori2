using Amori.Api.Features.ImportantDates.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.ImportantDates.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.ImportantDates.Controllers;

/// <summary>Important dates — birthdays, anniversaries, milestones.</summary>
[ApiController]
[Route("api/important-dates")]
[Authorize]
public sealed class ImportantDatesController(
    IImportantDateService importantDateService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ImportantDateResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await importantDateService.GetAllAsync(RequireUserId(), ct));

    [HttpGet("{dateId:guid}")]
    [ProducesResponseType(typeof(ImportantDateResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid dateId, CancellationToken ct) =>
        Ok(await importantDateService.GetByIdAsync(RequireUserId(), dateId, ct));

    [HttpPost]
    [ProducesResponseType(typeof(ImportantDateResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateImportantDateRequest req, CancellationToken ct)
    {
        var result = await importantDateService.CreateAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetById), new { dateId = result.Id }, result);
    }

    [HttpPatch("{dateId:guid}")]
    [ProducesResponseType(typeof(ImportantDateResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid dateId, [FromBody] UpdateImportantDateRequest req, CancellationToken ct) =>
        Ok(await importantDateService.UpdateAsync(RequireUserId(), dateId, req, ct));

    [HttpDelete("{dateId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid dateId, CancellationToken ct)
    {
        await importantDateService.DeleteAsync(RequireUserId(), dateId, ct);
        return NoContent();
    }
}
