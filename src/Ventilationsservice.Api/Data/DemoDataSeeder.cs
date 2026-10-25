using Microsoft.EntityFrameworkCore;
using Ventilationsservice.Api.Models;

namespace Ventilationsservice.Api.Data;

public static class DemoDataSeeder
{
    public static async Task<bool> SeedIfEmptyAsync(AppDbContext dbContext, CancellationToken cancellationToken = default)
    {
        await dbContext.Database.MigrateAsync(cancellationToken);

        if (await dbContext.VentilationUnits.AnyAsync(cancellationToken))
        {
            return false;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var now = DateTimeOffset.UtcNow;
        var units = new[]
        {
            new VentilationUnit
            {
                AssetNumber = "DEMO-VENT-001",
                Location = "Kontor, plan 2",
                Manufacturer = "Swegon",
                Model = "GOLD",
                ServiceCases =
                [
                    new ServiceCase
                    {
                        Title = "Byt filter",
                        Description = "Fiktivt exempelärende för demonstrationsdata.",
                        DueDate = today.AddDays(7),
                        CreatedAt = now.AddDays(-2)
                    }
                ]
            },
            new VentilationUnit
            {
                AssetNumber = "DEMO-VENT-002",
                Location = "Fläktrum, tak",
                Manufacturer = "Systemair",
                Model = "Geniox",
                ServiceCases =
                [
                    new ServiceCase
                    {
                        Title = "Kontrollera remdrift",
                        Description = "Fiktivt exempelärende som visas som försenat.",
                        DueDate = today.AddDays(-4),
                        CreatedAt = now.AddDays(-12)
                    },
                    new ServiceCase
                    {
                        Title = "Kontrollera temperaturgivare",
                        Description = "Fiktivt planerat kontrollärende.",
                        DueDate = today.AddDays(20),
                        CreatedAt = now.AddDays(-1)
                    }
                ]
            },
            new VentilationUnit
            {
                AssetNumber = "DEMO-VENT-003",
                Location = "Mötesrum, plan 1",
                Manufacturer = "IV Produkt",
                Model = "Envistar Flex",
                ServiceCases =
                [
                    new ServiceCase
                    {
                        Title = "Årlig service genomförd",
                        Description = "Fiktivt avslutat serviceärende i historiken.",
                        DueDate = today.AddDays(-30),
                        Status = ServiceCaseStatus.Completed,
                        CreatedAt = now.AddDays(-35),
                        CompletedAt = now.AddDays(-28)
                    }
                ]
            }
        };

        dbContext.VentilationUnits.AddRange(units);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
