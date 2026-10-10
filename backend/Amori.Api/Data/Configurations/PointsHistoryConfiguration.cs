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
        
        // Audit fields
        builder.Property(h => h.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(h => h.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(h => h.UserId).HasDatabaseName("IX_points_history_user_id");
        builder.HasIndex(h => h.CreatedAt).HasDatabaseName("IX_points_history_created_at");

        builder.HasOne(h => h.User)
            .WithMany(u => u.PointsHistory)
            .HasForeignKey(h => h.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
