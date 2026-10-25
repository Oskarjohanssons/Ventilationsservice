using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ventilationsservice.Api.Contracts;
using Ventilationsservice.Api.Data;
using Ventilationsservice.Api.Models;
using Ventilationsservice.Api.Services;

namespace Ventilationsservice.Api.Controllers;

[ApiController]
[Route("api/service-cases")]
public sealed class ServiceCasesController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ServiceCaseResponse>>> GetAll(
        [FromQuery] ServiceCaseStatus? status,
        [FromQuery] string? due,
        CancellationToken cancellationToken)
    {
        var query = dbContext.ServiceCases.AsNoTracking();
        if (status.HasValue)
        {
            query = query.Where(item => item.Status == status.Value);
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        if (string.Equals(due, "overdue", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(ServiceCaseDueRules.OverdueOn(today));
        }
        else if (string.Equals(due, "upcoming", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(ServiceCaseDueRules.UpcomingWithin30Days(today));
        }
        else if (!string.IsNullOrWhiteSpace(due))
        {
            ModelState.AddModelError(nameof(due), "Ange 'overdue' eller 'upcoming'.");
            return BadRequest(new ValidationProblemDetails(ModelState));
        }

        var records = await query
            .OrderBy(item => item.DueDate)
            .ThenBy(item => item.Title)
            .ToListAsync(cancellationToken);

        return Ok(records.Select(ToResponse).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServiceCaseResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var serviceCase = await dbContext.ServiceCases
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return serviceCase is null ? NotFound() : Ok(ToResponse(serviceCase));
    }

    [HttpPost("~/api/units/{unitId:guid}/service-cases")]
    public async Task<ActionResult<ServiceCaseResponse>> CreateForUnit(
        Guid unitId,
        CreateServiceCaseRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            ModelState.AddModelError(nameof(request.Title), "Ange en rubrik för serviceärendet.");
        }
        if (request.DueDate == default)
        {
            ModelState.AddModelError(nameof(request.DueDate), "Ange ett giltigt förfallodatum.");
        }
        if (!ModelState.IsValid)
        {
            return BadRequest(new ValidationProblemDetails(ModelState));
        }

        var unitExists = await dbContext.VentilationUnits
            .AnyAsync(item => item.Id == unitId, cancellationToken);
        if (!unitExists)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Aggregatet hittades inte.",
                Detail = "Skapa ärendet för ett befintligt aggregat."
            });
        }

        var serviceCase = new ServiceCase
        {
            VentilationUnitId = unitId,
            Title = request.Title.Trim(),
            Description = CleanOptional(request.Description),
            DueDate = request.DueDate
        };
        dbContext.ServiceCases.Add(serviceCase);
        await dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = serviceCase.Id }, ToResponse(serviceCase));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ServiceCaseResponse>> Update(
        Guid id,
        UpdateServiceCaseRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            ModelState.AddModelError(nameof(request.Title), "Ange en rubrik för serviceärendet.");
        }
        if (request.DueDate == default)
        {
            ModelState.AddModelError(nameof(request.DueDate), "Ange ett giltigt förfallodatum.");
        }
        if (!ModelState.IsValid)
        {
            return BadRequest(new ValidationProblemDetails(ModelState));
        }

        var serviceCase = await dbContext.ServiceCases
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (serviceCase is null)
        {
            return NotFound();
        }
        if (serviceCase.Status == ServiceCaseStatus.Completed)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Ärendet är redan genomfört.",
                Detail = "Genomförda ärenden kan inte ändras i den här versionen."
            });
        }

        serviceCase.Title = request.Title.Trim();
        serviceCase.Description = CleanOptional(request.Description);
        serviceCase.DueDate = request.DueDate;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(serviceCase));
    }

    [HttpPost("{id:guid}/complete")]
    public async Task<ActionResult<ServiceCaseResponse>> Complete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var serviceCase = await dbContext.ServiceCases
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (serviceCase is null)
        {
            return NotFound();
        }
        if (serviceCase.Status == ServiceCaseStatus.Completed)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Ärendet är redan genomfört.",
                Detail = "Ett genomfört ärende kan inte slutföras igen."
            });
        }

        serviceCase.Status = ServiceCaseStatus.Completed;
        serviceCase.CompletedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(serviceCase));
    }

    private static string? CleanOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ServiceCaseResponse ToResponse(ServiceCase item) =>
        new(item.Id, item.VentilationUnitId, item.Title, item.Description, item.DueDate,
            item.Status, item.CreatedAt, item.CompletedAt);
}
