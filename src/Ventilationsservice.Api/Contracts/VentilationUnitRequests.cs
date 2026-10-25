using System.ComponentModel.DataAnnotations;

namespace Ventilationsservice.Api.Contracts;

public sealed class SaveVentilationUnitRequest
{
    [Required, StringLength(50)]
    public string AssetNumber { get; init; } = string.Empty;
    [Required, StringLength(120)]
    public string Location { get; init; } = string.Empty;
    [StringLength(80)]
    public string? Manufacturer { get; init; }
    [StringLength(80)]
    public string? Model { get; init; }
}

public sealed record VentilationUnitResponse(Guid Id, string AssetNumber, string Location, string? Manufacturer, string? Model);

public sealed record VentilationUnitDetailsResponse(
    Guid Id,
    string AssetNumber,
    string Location,
    string? Manufacturer,
    string? Model,
    IReadOnlyList<ServiceCaseResponse> ServiceCases);
