using System.Linq.Expressions;
using Ventilationsservice.Api.Models;

namespace Ventilationsservice.Api.Services;

public static class ServiceCaseDueRules
{
    public static Expression<Func<ServiceCase, bool>> OverdueOn(DateOnly today) =>
        item => item.Status != ServiceCaseStatus.Completed && item.DueDate < today;

    public static Expression<Func<ServiceCase, bool>> UpcomingWithin30Days(DateOnly today)
    {
        var lastUpcomingDay = today.AddDays(30);
        return item => item.Status != ServiceCaseStatus.Completed &&
                       item.DueDate >= today &&
                       item.DueDate <= lastUpcomingDay;
    }
}
