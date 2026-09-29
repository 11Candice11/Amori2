using Amori.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Amori.Api.Data.Configurations;

/// <summary>
/// Maps <see cref="WeeklyReflectionArchive"/> to one row per kept week. The
/// computed view-model is stored as a jsonb column (Npgsql dynamic JSON, enabled
/// in <c>DatabaseExtensions</c>). A unique index on (user_id, week_key) enforces
/// one snapshot per week per owner, so re-saving a week overwrites it.
/// </summary>
public sealed class WeeklyReflectionArchiveConfiguration : IEntityTypeConfiguration<WeeklyReflectionArchive>
{
    public void Configure(EntityTypeBuilder<WeeklyReflectionArchive> builder)
    {
        builder.ToTable("weekly_reflection_archives");

        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id");
        builder.Property(a => a.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(a => a.WeekKey).HasColumnName("week_key").HasMaxLength(10).IsRequired();
        builder.Property(a => a.RangeLabel).HasColumnName("range_label").HasMaxLength(120).IsRequired();
        builder.Property(a => a.MoodDataPartial).HasColumnName("mood_data_partial").IsRequired();
        builder.Property(a => a.Snapshot).HasColumnName("snapshot").HasColumnType("jsonb").IsRequired();
        builder.Property(a => a.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(a => a.UpdatedAt).HasColumnName("updated_at");

        // One snapshot per (user, week); the service upserts on this key.
        builder.HasIndex(a => new { a.UserId, a.WeekKey })
            .IsUnique()
            .HasDatabaseName("IX_weekly_reflection_archives_user_id_week_key");

        // Private user data: it goes when the user goes.
        builder.HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
