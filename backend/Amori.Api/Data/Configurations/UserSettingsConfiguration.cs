using Amori.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Amori.Api.Data.Configurations;

public sealed class UserSettingsConfiguration : IEntityTypeConfiguration<UserSettings>
{
    public void Configure(EntityTypeBuilder<UserSettings> builder)
    {
        builder.ToTable("user_settings");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.UserId).HasColumnName("user_id").IsRequired();
        
        // Legacy notification settings
        builder.Property(s => s.PushNotificationsEnabled).HasColumnName("push_notifications_enabled").IsRequired();
        builder.Property(s => s.MoodRemindersEnabled).HasColumnName("mood_reminders_enabled").IsRequired();
        builder.Property(s => s.MessageNotifications).HasColumnName("message_notifications").IsRequired();
        builder.Property(s => s.ReminderNotifications).HasColumnName("reminder_notifications").IsRequired();
        builder.Property(s => s.ProfileVisible).HasColumnName("profile_visible").IsRequired();
        
        // Privacy & Sharing
        builder.Property(s => s.MoodShareDefault).HasColumnName("mood_share_default").IsRequired();
        builder.Property(s => s.ShareActivity).HasColumnName("share_activity").IsRequired().HasDefaultValue(true);
        builder.Property(s => s.ShareCheckIns).HasColumnName("share_check_ins").IsRequired().HasDefaultValue(true);
        builder.Property(s => s.ShareLocation).HasColumnName("share_location").IsRequired().HasDefaultValue(true);
        builder.Property(s => s.ShareTimeline).HasColumnName("share_timeline").IsRequired().HasDefaultValue(true);
        
        // Permissions
        builder.Property(s => s.AllowHugs).HasColumnName("allow_hugs").IsRequired().HasDefaultValue(true);
        builder.Property(s => s.AllowEmergencyAlerts).HasColumnName("allow_emergency_alerts").IsRequired().HasDefaultValue(true);
        builder.Property(s => s.AllowPartnerReminders).HasColumnName("allow_partner_reminders").IsRequired().HasDefaultValue(true);
        
        // Notifications
        builder.Property(s => s.NotificationsEnabled).HasColumnName("notifications_enabled").IsRequired().HasDefaultValue(true);
        builder.Property(s => s.HugNotifications).HasColumnName("hug_notifications").IsRequired();
        builder.Property(s => s.EmergencyNotifications).HasColumnName("emergency_notifications").IsRequired();
        builder.Property(s => s.CheckInReminders).HasColumnName("check_in_reminders").IsRequired().HasDefaultValue(true);
        builder.Property(s => s.PartnerActivityNotifications).HasColumnName("partner_activity_notifications").IsRequired();
        builder.Property(s => s.DailyDigest).HasColumnName("daily_digest").IsRequired().HasDefaultValue(true);
        
        // App Preferences
        builder.Property(s => s.SoundEnabled).HasColumnName("sound_enabled").IsRequired().HasDefaultValue(true);
        builder.Property(s => s.VibrationEnabled).HasColumnName("vibration_enabled").IsRequired().HasDefaultValue(true);
        
        // Audit fields
        builder.Property(s => s.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(s => s.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(s => s.UserId).IsUnique().HasDatabaseName("IX_user_settings_user_id");

        builder.HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
