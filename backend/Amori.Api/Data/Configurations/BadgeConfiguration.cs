using Amori.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Amori.Api.Data.Configurations;

public sealed class BadgeConfiguration : IEntityTypeConfiguration<Badge>
{
    public void Configure(EntityTypeBuilder<Badge> builder)
    {
        builder.ToTable("badges");

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(b => b.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(b => b.Slug).HasColumnName("slug").HasMaxLength(64);
        builder.Property(b => b.BadgeName).HasColumnName("badge_name").HasMaxLength(255).IsRequired();
        builder.Property(b => b.Description).HasColumnName("description").HasMaxLength(500).IsRequired();
        builder.Property(b => b.AwardedAtLevel).HasColumnName("awarded_at_level").IsRequired();
        builder.Property(b => b.ImageKey).HasColumnName("image_key").HasMaxLength(255);
        builder.Property(b => b.ImageUrl).HasColumnName("image_url").HasMaxLength(1000);
        builder.Property(b => b.IsArchivedInVault).HasColumnName("is_archived_in_vault").IsRequired().HasDefaultValue(false);
        builder.Property(b => b.EarnedAt).HasColumnName("earned_at").IsRequired();
        
        // Audit fields
        builder.Property(b => b.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(b => b.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(b => b.UserId).HasDatabaseName("IX_badges_user_id");
        // Two kinds of badge share this table, each unique within its own key:
        // level milestones by level (slug null), catalogue badges by slug. The
        // filters stop every catalogue badge (all at level 0) colliding.
        builder.HasIndex(b => new { b.UserId, b.AwardedAtLevel })
            .IsUnique()
            .HasFilter("slug IS NULL")
            .HasDatabaseName("IX_badges_user_level");
        builder.HasIndex(b => new { b.UserId, b.Slug })
            .IsUnique()
            .HasFilter("slug IS NOT NULL")
            .HasDatabaseName("IX_badges_user_slug");

        builder.HasOne(b => b.User)
            .WithMany(u => u.Badges)
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
