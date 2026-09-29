using Amori.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Amori.Api.Data.Configurations;

public sealed class VisionBoardItemConfiguration : IEntityTypeConfiguration<VisionBoardItem>
{
    public void Configure(EntityTypeBuilder<VisionBoardItem> builder)
    {
        builder.ToTable("vision_board_items");

        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasColumnName("id");
        builder.Property(i => i.RelationshipId).HasColumnName("relationship_id").IsRequired();
        builder.Property(i => i.CreatedByUserId).HasColumnName("created_by_user_id").IsRequired();
        builder.Property(i => i.SectionId).HasColumnName("section_id").IsRequired();
        builder.Property(i => i.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
        builder.Property(i => i.Description).HasColumnName("description").HasMaxLength(4000);
        builder.Property(i => i.Type).HasColumnName("type").HasConversion<int>().IsRequired();
        builder.Property(i => i.ImageFileKey).HasColumnName("image_file_key").HasMaxLength(500);
        builder.Property(i => i.LocationName).HasColumnName("location_name").HasMaxLength(300);
        builder.Property(i => i.Latitude).HasColumnName("latitude");
        builder.Property(i => i.Longitude).HasColumnName("longitude");
        builder.Property(i => i.TargetDate).HasColumnName("target_date");
        builder.Property(i => i.Budget).HasColumnName("budget").HasColumnType("numeric(14,2)");
        builder.Property(i => i.ExternalReference).HasColumnName("external_reference").HasMaxLength(1000);
        builder.Property(i => i.Notes).HasColumnName("notes").HasMaxLength(4000);
        builder.Property(i => i.IsPinned).HasColumnName("is_pinned").IsRequired();
        builder.Property(i => i.IsCompleted).HasColumnName("is_completed").IsRequired();
        builder.Property(i => i.CompletedAt).HasColumnName("completed_at");
        builder.Property(i => i.CompletedNote).HasColumnName("completed_note").HasMaxLength(2000);
        builder.Property(i => i.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(i => i.IsDeleted).HasColumnName("is_deleted").IsRequired();
        builder.Property(i => i.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(i => i.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(i => i.RelationshipId).HasDatabaseName("IX_vision_board_items_relationship_id");
        builder.HasIndex(i => i.SectionId).HasDatabaseName("IX_vision_board_items_section_id");
        builder.HasIndex(i => i.CreatedByUserId).HasDatabaseName("IX_vision_board_items_created_by_user_id");
        builder.HasIndex(i => i.IsDeleted).HasDatabaseName("IX_vision_board_items_is_deleted");

        builder.HasOne(i => i.Relationship)
            .WithMany()
            .HasForeignKey(i => i.RelationshipId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.CreatedBy)
            .WithMany()
            .HasForeignKey(i => i.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Section)
            .WithMany(s => s.Items)
            .HasForeignKey(i => i.SectionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
