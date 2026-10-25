using Microsoft.EntityFrameworkCore;
using Ventilationsservice.Api.Models;

namespace Ventilationsservice.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<VentilationUnit> VentilationUnits => Set<VentilationUnit>();
    public DbSet<ServiceCase> ServiceCases => Set<ServiceCase>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<VentilationUnit>(entity =>
        {
            entity.HasKey(unit => unit.Id);
            entity.Property(unit => unit.AssetNumber).HasMaxLength(50).IsRequired();
            entity.Property(unit => unit.Location).HasMaxLength(120).IsRequired();
            entity.Property(unit => unit.Manufacturer).HasMaxLength(80);
            entity.Property(unit => unit.Model).HasMaxLength(80);
            entity.HasIndex(unit => unit.AssetNumber).IsUnique();
        });

        modelBuilder.Entity<ServiceCase>(entity =>
        {
            entity.HasKey(serviceCase => serviceCase.Id);
            entity.Property(serviceCase => serviceCase.Title).HasMaxLength(120).IsRequired();
            entity.Property(serviceCase => serviceCase.Description).HasMaxLength(2000);
            entity.Property(serviceCase => serviceCase.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasOne(serviceCase => serviceCase.VentilationUnit)
                .WithMany(unit => unit.ServiceCases)
                .HasForeignKey(serviceCase => serviceCase.VentilationUnitId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(serviceCase => new { serviceCase.Status, serviceCase.DueDate });
        });
    }
}
