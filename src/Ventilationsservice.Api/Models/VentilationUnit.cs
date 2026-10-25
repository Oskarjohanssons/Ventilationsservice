namespace Ventilationsservice.Api.Models;

public sealed class VentilationUnit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string AssetNumber { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public List<ServiceCase> ServiceCases { get; set; } = [];
}
