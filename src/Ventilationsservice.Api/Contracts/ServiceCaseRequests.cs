using System.ComponentModel.DataAnnotations;
using Ventilationsservice.Api.Models;

namespace Ventilationsservice.Api.Contracts;

public sealed class CreateServiceCaseRequest
{
    [Required, StringLength(120)]
    public string Title { get; init; } = string.Empty;
    [StringLength(2000)]
    public string? Description { get; init; }
    public DateOnly DueDate { get; init; }
}

public sealed class UpdateServiceCaseRequest
{
    [Required, StringLength(120)]
    public string Title { get; init; } = string.Empty;
    [StringLength(2000)]
    public string? Description { get; init; }
    public DateOnly DueDate { get; init; }
}

public sealed record ServiceCaseResponse(
    Guid Id,
    Guid VentilationUnitId,
    string Title,
    string? Description,
    DateOnly DueDate,
    ServiceCaseStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? CompletedAt);
