using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ventilationsservice.Api.Contracts;
using Ventilationsservice.Api.Data;
using Ventilationsservice.Api.Models;

namespace Ventilationsservice.Api.Controllers;

[ApiController]
[Route("api/units")]
public sealed class VentilationUnitsController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<VentilationUnitResponse>>> GetAll(
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var query = dbContext.VentilationUnits.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchTerm = search.Trim();
            query = query.Where(unit =>
                unit.AssetNumber.Contains(searchTerm) || unit.Location.Contains(searchTerm));
        }

        var units = await query
            .OrderBy(unit => unit.AssetNumber)
            .Select(unit => new VentilationUnitResponse(
                unit.Id, unit.AssetNumber, unit.Location, unit.Manufacturer, unit.Model))
            .ToListAsync(cancellationToken);

        return Ok(units);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<VentilationUnitDetailsResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var unit = await dbContext.VentilationUnits
            .AsNoTracking()
            .Include(item => item.ServiceCases)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (unit is null)
        {
            return NotFound();
        }

        var response = new VentilationUnitDetailsResponse(
            unit.Id,
            unit.AssetNumber,
            unit.Location,
            unit.Manufacturer,
            unit.Model,
            unit.ServiceCases
                .OrderByDescending(item => item.CreatedAt)
                .Select(ToResponse)
                .ToList());

        return Ok(response);
    }

    [HttpPost]
    public async Task<ActionResult<VentilationUnitResponse>> Create(
        SaveVentilationUnitRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.AssetNumber) || string.IsNullOrWhiteSpace(request.Location))
        {
            ModelState.AddModelError(nameof(request.AssetNumber), "Ange inventarienummer och plats.");
            ModelState.AddModelError(nameof(request.Location), "Ange inventarienummer och plats.");
            return BadRequest(new ValidationProblemDetails(ModelState));
        }

        var assetNumber = NormalizeAssetNumber(request.AssetNumber);
        if (await dbContext.VentilationUnits.AnyAsync(
                item => item.AssetNumber == assetNumber, cancellationToken))
        {
            return Conflict(new ProblemDetails
            {
                Title = "Inventarienumret finns redan.",
                Detail = "Ange ett unikt inventarienummer för aggregatet."
            });
        }

        var unit = new VentilationUnit
        {
            AssetNumber = assetNumber,
            Location = request.Location.Trim(),
            Manufacturer = CleanOptional(request.Manufacturer),
            Model = CleanOptional(request.Model)
        };
        dbContext.VentilationUnits.Add(unit);
        await dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = unit.Id }, ToResponse(unit));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<VentilationUnitResponse>> Update(
        Guid id,
        SaveVentilationUnitRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.AssetNumber) || string.IsNullOrWhiteSpace(request.Location))
        {
            ModelState.AddModelError(nameof(request.AssetNumber), "Ange inventarienummer och plats.");
            ModelState.AddModelError(nameof(request.Location), "Ange inventarienummer och plats.");
            return BadRequest(new ValidationProblemDetails(ModelState));
        }

        var unit = await dbContext.VentilationUnits
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (unit is null)
        {
            return NotFound();
        }

        var assetNumber = NormalizeAssetNumber(request.AssetNumber);
        if (await dbContext.VentilationUnits.AnyAsync(
                item => item.Id != id && item.AssetNumber == assetNumber, cancellationToken))
        {
            return Conflict(new ProblemDetails
            {
                Title = "Inventarienumret finns redan.",
                Detail = "Ange ett unikt inventarienummer för aggregatet."
            });
        }

        unit.AssetNumber = assetNumber;
        unit.Location = request.Location.Trim();
        unit.Manufacturer = CleanOptional(request.Manufacturer);
        unit.Model = CleanOptional(request.Model);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(unit));
    }

    private static string NormalizeAssetNumber(string value) => value.Trim().ToUpperInvariant();

    private static string? CleanOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static VentilationUnitResponse ToResponse(VentilationUnit unit) =>
        new(unit.Id, unit.AssetNumber, unit.Location, unit.Manufacturer, unit.Model);

    private static ServiceCaseResponse ToResponse(ServiceCase item) =>
        new(item.Id, item.VentilationUnitId, item.Title, item.Description, item.DueDate,
            item.Status, item.CreatedAt, item.CompletedAt);
}
