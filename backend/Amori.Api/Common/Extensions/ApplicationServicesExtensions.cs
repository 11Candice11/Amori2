using Amori.Api.Features.Auth.Services;
using Amori.Api.Features.BucketList.Services;
using Amori.Api.Features.Calendar.Services;
using Amori.Api.Features.DatePlanner.Services;
using Amori.Api.Features.Distraction.Services;
using Amori.Api.Features.Emergency.Services;
using Amori.Api.Features.Hugs.Services;
using Amori.Api.Features.ImportantDates.Services;
using Amori.Api.Features.Incidents.Services;
using Amori.Api.Features.LetsChat.Services;
using Amori.Api.Features.Memories.Services;
using Amori.Api.Features.Messages.Services;
using Amori.Api.Features.Mood.Services;
using Amori.Api.Features.Notifications.Services;
using Amori.Api.Features.RelationshipTickets.Services;
using Amori.Api.Features.Relationships.Services;
using Amori.Api.Features.Reminders.Services;
using Amori.Api.Features.Splitting.Services;
using Amori.Api.Features.SupportProfile.Services;
using Amori.Api.Features.Timeline.Services;
using Amori.Api.Features.Users.Services;
using Amori.Api.Features.Vault.Services;
using Amori.Api.Features.VisionBoard.Services;
using Amori.Api.Features.VoiceNotes.Services;
using Amori.Api.Features.Wishlist.Services;
using Amori.Api.Infrastructure.Notifications;
using Amori.Api.Infrastructure.Relationships;

namespace Amori.Api.Common.Extensions;

public static class ApplicationServicesExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // ── Infrastructure ────────────────────────────────────────────────────
        services.AddScoped<IRelationshipAccessService, RelationshipAccessService>();
        services.AddHttpClient<IPushNotificationService, ExpoPushNotificationService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
        });

        // ── Auth ──────────────────────────────────────────────────────────────
        services.AddScoped<IAuthService, AuthService>();

        // ── Relationships ─────────────────────────────────────────────────────
        services.AddScoped<IRelationshipService, RelationshipService>();
        services.AddScoped<IPartnerLinkService, PartnerLinkService>();

        // ── Users ─────────────────────────────────────────────────────────────
        services.AddScoped<IUserService, UserService>();

        // ── Mood ──────────────────────────────────────────────────────────────
        services.AddScoped<IMoodService, MoodService>();

        // ── Messages ──────────────────────────────────────────────────────────
        services.AddScoped<IMessageService, MessageService>();

        // ── Let's Chat (guided templated messages) ────────────────────────────
        services.AddScoped<IChatService, ChatService>();

        // ── Hugs ──────────────────────────────────────────────────────────────
        services.AddScoped<IHugService, HugService>();

        // ── Emergency ─────────────────────────────────────────────────────────
        services.AddScoped<IEmergencyService, EmergencyService>();

        // ── Splitting ─────────────────────────────────────────────────────────
        services.AddScoped<ISplittingService, SplittingService>();

        // ── Support Profile ("How to Know Me" / Support Preferences) ──────────
        services.AddScoped<ISupportProfileService, SupportProfileService>();

        // ── Reminders ─────────────────────────────────────────────────────────
        services.AddScoped<IReminderService, ReminderService>();

        // ── Notifications ─────────────────────────────────────────────────────
        services.AddScoped<INotificationService, NotificationService>();

        // ── Calendar ──────────────────────────────────────────────────────────
        services.AddScoped<ICalendarService, CalendarService>();

        // ── Important Dates ───────────────────────────────────────────────────
        services.AddScoped<IImportantDateService, ImportantDateService>();

        // ── Date Planner ──────────────────────────────────────────────────────
        services.AddScoped<IDatePlannerService, DatePlannerService>();

        // ── BucketList ────────────────────────────────────────────────────────
        services.AddScoped<IBucketListService, BucketListService>();

        // ── Vision Board ("Us") ───────────────────────────────────────────────
        services.AddScoped<IVisionBoardService, VisionBoardService>();

        // ── Wishlist ──────────────────────────────────────────────────────────
        services.AddScoped<IWishlistService, WishlistService>();

        // ── Memories ──────────────────────────────────────────────────────────
        services.AddScoped<IMemoryService, MemoryService>();

        // ── Vault ─────────────────────────────────────────────────────────────
        services.AddScoped<IVaultService, VaultService>();

        // ── Voice Notes ───────────────────────────────────────────────────────
        services.AddScoped<IVoiceNoteService, VoiceNoteService>();

        // ── Timeline ──────────────────────────────────────────────────────────
        services.AddScoped<ITimelineService, TimelineService>();

        // ── Relationship Tickets ──────────────────────────────────────────────
        services.AddScoped<IRelationshipTicketService, RelationshipTicketService>();

        // ── Distraction ───────────────────────────────────────────────────────
        services.AddScoped<IDistractionService, DistractionService>();
        services.AddScoped<IQuizService, QuizService>();
        services.AddScoped<IWouldYouRatherService, WouldYouRatherService>();
        services.AddScoped<IHiddenObjectService, HiddenObjectService>();

        // ── Incident Management ───────────────────────────────────────────────
        services.AddScoped<IIncidentService, IncidentService>();
        services.AddSingleton<IIncidentPriorityService, IncidentPriorityService>();
        services.AddSingleton<IIncidentStatusService, IncidentStatusService>();
        services.AddSingleton<IIncidentSlaService, IncidentSlaService>();
        // Background monitor: proactively notifies members when an incident breaches its SLA.
        services.AddHostedService<IncidentSlaMonitor>();

        return services;
    }
}
