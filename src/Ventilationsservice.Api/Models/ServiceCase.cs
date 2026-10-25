namespace Ventilationsservice.Api.Models;

public sealed class ServiceCase
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid VentilationUnitId { get; set; }
    public VentilationUnit? VentilationUnit { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly DueDate { get; set; }
    public ServiceCaseStatus Status { get; set; } = ServiceCaseStatus.Open;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }
}
