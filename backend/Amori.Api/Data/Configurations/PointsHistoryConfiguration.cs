using Amori.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Amori.Api.Data.Configurations;

public sealed class PointsHistoryConfiguration : IEntityTypeConfiguration<PointsHistory>
{
    public void Configure(EntityTypeBuilder<PointsHistory> builder)
    {
        builder.ToTable("points_history");

        builder.HasKey(h => h.Id);
        builder.Property(h => h.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(h => h.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(h => h.ActivityType).HasColumnName("activity_type").IsRequired();
        builder.Property(h => h.PointsAwarded).HasColumnName("points_awarded").IsRequired();
        builder.Property(h => h.TotalPointsAfter).HasColumnName("total_points_after").IsRequired();
        builder.Property(h => h.ReferenceId).HasColumnName("reference_id");
        builder.Property(h => h.Metadata).HasColumnName("metadata").HasMaxLength(1000);
        builder.Property(h => h.LocalDate).HasColumnName("local_date");
        
        // Audit fields
        builder.Property(h => h.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(h => h.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(h => h.UserId).HasDatabaseName("IX_points_history_user_id");
        builder.HasIndex(h => h.CreatedAt).HasDatabaseName("IX_points_history_created_at");

        // Backs the once-a-day guard, which looks up (user, activity, local date).
        builder.HasIndex(h => new { h.UserId, h.ActivityType, h.LocalDate })
            .HasDatabaseName("IX_points_history_user_activity_local_date");

        // The history backfill runs once per user, ever. 12 = ActivityType.HistoryBackfill
        // (stored as int); a concurrent second run hits this and is discarded.
        // Keyed on (user, activity) rather than user alone: EF would otherwise
        // treat it as the same index as IX_points_history_user_id and replace it.
        builder.HasIndex(h => new { h.UserId, h.ActivityType })
            .IsUnique()
            .HasFilter("activity_type = 12")
            .HasDatabaseName("IX_points_history_user_history_backfill");

        builder.HasOne(h => h.User)
            .WithMany(u => u.PointsHistory)
            .HasForeignKey(h => h.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
