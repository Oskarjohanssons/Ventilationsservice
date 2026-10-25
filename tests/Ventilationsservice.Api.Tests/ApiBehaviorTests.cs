using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Ventilationsservice.Api.Contracts;
using Ventilationsservice.Api.Controllers;
using Ventilationsservice.Api.Data;
using Ventilationsservice.Api.Models;

namespace Ventilationsservice.Api.Tests;

public sealed class ApiBehaviorTests : IAsyncLifetime
{
    private SqliteConnection _connection = null!;
    private AppDbContext _dbContext = null!;

    public async Task InitializeAsync()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        await _connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        _dbContext = new AppDbContext(options);
        await _dbContext.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        await _dbContext.DisposeAsync();
        await _connection.DisposeAsync();
    }

    [Fact]
    public async Task CreateUnit_TrimsFieldsAndNormalizesAssetNumber()
    {
        var controller = new VentilationUnitsController(_dbContext);

        var result = await controller.Create(
            new SaveVentilationUnitRequest
            {
                AssetNumber = "  vent-002 ",
                Location = "  Tak, plan 3 ",
                Manufacturer = "  Swegon "
            },
            CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var response = Assert.IsType<VentilationUnitResponse>(created.Value);
        Assert.Equal("VENT-002", response.AssetNumber);
        Assert.Equal("Tak, plan 3", response.Location);
        Assert.Equal("Swegon", response.Manufacturer);
        Assert.Single(await _dbContext.VentilationUnits.ToListAsync());
    }

    [Fact]
    public async Task CreateUnit_ReturnsConflictForDuplicateAssetNumberIgnoringCase()
    {
        _dbContext.VentilationUnits.Add(new VentilationUnit
        {
            AssetNumber = "VENT-002",
            Location = "Tak, plan 3"
        });
        await _dbContext.SaveChangesAsync();

        var controller = new VentilationUnitsController(_dbContext);
        var result = await controller.Create(
            new SaveVentilationUnitRequest { AssetNumber = "vent-002", Location = "Källare" },
            CancellationToken.None);

        Assert.IsType<ConflictObjectResult>(result.Result);
        Assert.Single(await _dbContext.VentilationUnits.ToListAsync());
    }

    [Fact]
    public async Task CompleteCase_SetsCompletionTimeAndRejectsSecondCompletion()
    {
        var serviceCase = new ServiceCase
        {
            VentilationUnit = new VentilationUnit { AssetNumber = "VENT-003", Location = "Fläktrum" },
            Title = "Kontrollera filter",
            DueDate = new DateOnly(2026, 11, 10)
        };
        _dbContext.ServiceCases.Add(serviceCase);
        await _dbContext.SaveChangesAsync();

        var controller = new ServiceCasesController(_dbContext);
        var first = await controller.Complete(serviceCase.Id, CancellationToken.None);
        var response = Assert.IsType<ServiceCaseResponse>(Assert.IsType<OkObjectResult>(first.Result).Value);

        Assert.Equal(ServiceCaseStatus.Completed, response.Status);
        Assert.NotNull(response.CompletedAt);

        var second = await controller.Complete(serviceCase.Id, CancellationToken.None);
        Assert.IsType<ConflictObjectResult>(second.Result);
    }
}

