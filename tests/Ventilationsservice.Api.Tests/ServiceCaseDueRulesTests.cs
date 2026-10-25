using Ventilationsservice.Api.Models;
using Ventilationsservice.Api.Services;

namespace Ventilationsservice.Api.Tests;

public sealed class ServiceCaseDueRulesTests
{
    private static readonly DateOnly Today = new(2026, 10, 25);

    [Fact]
    public void OverdueOn_IncludesOpenCasesBeforeToday()
    {
        var predicate = ServiceCaseDueRules.OverdueOn(Today).Compile();

        Assert.True(predicate(CreateCase(Today.AddDays(-1))));
        Assert.False(predicate(CreateCase(Today)));
        Assert.False(predicate(CreateCase(Today.AddDays(-1), ServiceCaseStatus.Completed)));
    }

    [Fact]
    public void UpcomingWithin30Days_IncludesBothBoundaryDates()
    {
        var predicate = ServiceCaseDueRules.UpcomingWithin30Days(Today).Compile();

        Assert.True(predicate(CreateCase(Today)));
        Assert.True(predicate(CreateCase(Today.AddDays(30))));
        Assert.False(predicate(CreateCase(Today.AddDays(31))));
        Assert.False(predicate(CreateCase(Today.AddDays(5), ServiceCaseStatus.Completed)));
    }

    private static ServiceCase CreateCase(
        DateOnly dueDate,
        ServiceCaseStatus status = ServiceCaseStatus.Open) =>
        new()
        {
            Title = "Filterbyte",
            DueDate = dueDate,
            Status = status
        };
}
