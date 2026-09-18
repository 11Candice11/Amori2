using Amori.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Amori.Api.Data.Configurations;

public sealed class HiddenObjectPuzzleConfiguration : IEntityTypeConfiguration<HiddenObjectPuzzle>
{
    public void Configure(EntityTypeBuilder<HiddenObjectPuzzle> builder)
    {
        builder.ToTable("hidden_object_puzzles");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.RelationshipId).HasColumnName("relationship_id").IsRequired();
        builder.Property(p => p.CreatedByUserId).HasColumnName("created_by_user_id").IsRequired();
        builder.Property(p => p.ImageFileKey).HasColumnName("image_file_key").HasMaxLength(500).IsRequired();
        builder.Property(p => p.Prompt).HasColumnName("prompt").HasMaxLength(500).IsRequired();
        builder.Property(p => p.TargetX).HasColumnName("target_x").IsRequired();
        builder.Property(p => p.TargetY).HasColumnName("target_y").IsRequired();
        builder.Property(p => p.TargetRadius).HasColumnName("target_radius").IsRequired();
        builder.Property(p => p.IsActive).HasColumnName("is_active").IsRequired();
        builder.Property(p => p.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(p => p.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(p => p.RelationshipId).HasDatabaseName("IX_hidden_object_puzzles_relationship_id");
        builder.HasIndex(p => p.IsActive).HasDatabaseName("IX_hidden_object_puzzles_is_active");

        builder.HasOne(p => p.Relationship)
            .WithMany()
            .HasForeignKey(p => p.RelationshipId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.CreatedBy)
            .WithMany()
            .HasForeignKey(p => p.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
