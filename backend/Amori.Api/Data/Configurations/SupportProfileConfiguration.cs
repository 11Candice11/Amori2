using Amori.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Amori.Api.Data.Configurations;

/// <summary>
/// Maps <see cref="SupportProfile"/> to a single row per user. The seven
/// sections are stored as jsonb columns (relying on Npgsql dynamic JSON, enabled
/// in <c>DatabaseExtensions</c>) so we keep structured data without a table per
/// section. A unique index on user_id enforces one profile per owner.
/// </summary>
public sealed class SupportProfileConfiguration : IEntityTypeConfiguration<SupportProfile>
{
    public void Configure(EntityTypeBuilder<SupportProfile> builder)
    {
        builder.ToTable("support_profiles");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(p => p.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(p => p.UpdatedAt).HasColumnName("updated_at");

        builder.Property(p => p.WhoIAm).HasColumnName("who_i_am").HasColumnType("jsonb").IsRequired();
        builder.Property(p => p.WhatILike).HasColumnName("what_i_like").HasColumnType("jsonb").IsRequired();
        builder.Property(p => p.Favorites).HasColumnName("favorites").HasColumnType("jsonb").IsRequired();
        builder.Property(p => p.HowToHelpMe).HasColumnName("how_to_help_me").HasColumnType("jsonb").IsRequired();
        builder.Property(p => p.ThingsToKnow).HasColumnName("things_to_know").HasColumnType("jsonb").IsRequired();
        builder.Property(p => p.Boundaries).HasColumnName("boundaries").HasColumnType("jsonb").IsRequired();
        builder.Property(p => p.LittleThings).HasColumnName("little_things").HasColumnType("jsonb").IsRequired();

        builder.HasIndex(p => p.UserId)
            .IsUnique()
            .HasDatabaseName("IX_support_profiles_user_id");

        builder.HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
