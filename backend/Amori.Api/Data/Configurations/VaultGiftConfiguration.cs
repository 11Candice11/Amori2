using Amori.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Amori.Api.Data.Configurations;

public sealed class VaultGiftConfiguration : IEntityTypeConfiguration<VaultGift>
{
    public void Configure(EntityTypeBuilder<VaultGift> builder)
    {
        builder.ToTable("vault_gifts");

        builder.HasKey(g => g.Id);
        builder.Property(g => g.Id).HasColumnName("id");
        builder.Property(g => g.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(g => g.MemoryId).HasColumnName("memory_id").IsRequired();
        builder.Property(g => g.CardNumber).HasColumnName("card_number").IsRequired();
        builder.Property(g => g.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(g => g.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(g => g.UserId).HasDatabaseName("IX_vault_gifts_user_id");

        // A memory can sit in each partner's vault independently, but only once
        // in either — so the uniqueness is per (user, memory), not per memory.
        builder.HasIndex(g => new { g.UserId, g.MemoryId })
            .IsUnique()
            .HasDatabaseName("IX_vault_gifts_user_id_memory_id");

        // The vault is private user data: it goes when the user goes.
        builder.HasOne(g => g.User)
            .WithMany()
            .HasForeignKey(g => g.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Memories are soft-deleted (Memory.IsDeleted), so the row should never
        // disappear from under a vault entry. Restrict keeps that honest.
        builder.HasOne(g => g.Memory)
            .WithMany()
            .HasForeignKey(g => g.MemoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
