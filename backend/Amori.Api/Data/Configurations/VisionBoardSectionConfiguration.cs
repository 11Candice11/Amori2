using Amori.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Amori.Api.Data.Configurations;

public sealed class VisionBoardSectionConfiguration : IEntityTypeConfiguration<VisionBoardSection>
{
    public void Configure(EntityTypeBuilder<VisionBoardSection> builder)
    {
        builder.ToTable("vision_board_sections");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.RelationshipId).HasColumnName("relationship_id").IsRequired();
        builder.Property(s => s.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(s => s.Description).HasColumnName("description").HasMaxLength(2000);
        builder.Property(s => s.CoverImageFileKey).HasColumnName("cover_image_file_key").HasMaxLength(500);
        builder.Property(s => s.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(s => s.IsDefault).HasColumnName("is_default").IsRequired();
        builder.Property(s => s.IsDeleted).HasColumnName("is_deleted").IsRequired();
        builder.Property(s => s.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(s => s.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(s => s.RelationshipId).HasDatabaseName("IX_vision_board_sections_relationship_id");
        builder.HasIndex(s => s.IsDeleted).HasDatabaseName("IX_vision_board_sections_is_deleted");

        builder.HasOne(s => s.Relationship)
            .WithMany()
            .HasForeignKey(s => s.RelationshipId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Items)
            .WithOne(i => i.Section)
            .HasForeignKey(i => i.SectionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
