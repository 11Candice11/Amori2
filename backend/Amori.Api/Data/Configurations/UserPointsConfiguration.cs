using Amori.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Amori.Api.Data.Configurations;

public sealed class UserPointsConfiguration : IEntityTypeConfiguration<UserPoints>
{
    public void Configure(EntityTypeBuilder<UserPoints> builder)
    {
        builder.ToTable("user_points");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(p => p.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(p => p.TotalPoints).HasColumnName("total_points").IsRequired().HasDefaultValue(0);
        builder.Property(p => p.Level).HasColumnName("level").IsRequired().HasDefaultValue(1);
        builder.Property(p => p.LastPointsAddedAt).HasColumnName("last_points_added_at");
        
        // Audit fields
        builder.Property(p => p.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(p => p.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(p => p.UserId).IsUnique().HasDatabaseName("IX_user_points_user_id");

        builder.HasOne(p => p.User)
            .WithOne(u => u.UserPoints)
            .HasForeignKey<UserPoints>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
