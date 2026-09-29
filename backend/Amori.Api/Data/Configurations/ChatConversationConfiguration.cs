using Amori.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Amori.Api.Data.Configurations;

public sealed class ChatConversationConfiguration : IEntityTypeConfiguration<ChatConversation>
{
    public void Configure(EntityTypeBuilder<ChatConversation> builder)
    {
        builder.ToTable("chat_conversations");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.RelationshipId).HasColumnName("relationship_id").IsRequired();
        builder.Property(c => c.SenderId).HasColumnName("sender_id").IsRequired();
        builder.Property(c => c.RecipientId).HasColumnName("recipient_id");
        builder.Property(c => c.TemplateType).HasColumnName("template_type").IsRequired();
        builder.Property(c => c.Status).HasColumnName("status").IsRequired();

        // The per-step answers are a small string→string map. Stored as jsonb to
        // match the app's convention for structured collection columns (Tags,
        // Options, FeelingsSelected, …).
        builder.Property(c => c.Answers)
            .HasColumnName("answers")
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(c => c.ComposedMessage).HasColumnName("composed_message").HasMaxLength(4000).IsRequired();
        builder.Property(c => c.IsPrivate).HasColumnName("is_private").IsRequired();
        builder.Property(c => c.SentAt).HasColumnName("sent_at");
        builder.Property(c => c.ReadAt).HasColumnName("read_at");
        builder.Property(c => c.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(c => c.RelationshipId).HasDatabaseName("IX_chat_conversations_relationship_id");
        builder.HasIndex(c => c.SenderId).HasDatabaseName("IX_chat_conversations_sender_id");
        builder.HasIndex(c => c.RecipientId).HasDatabaseName("IX_chat_conversations_recipient_id");
        builder.HasIndex(c => c.Status).HasDatabaseName("IX_chat_conversations_status");

        builder.HasOne(c => c.Relationship)
            .WithMany()
            .HasForeignKey(c => c.RelationshipId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.Sender)
            .WithMany()
            .HasForeignKey(c => c.SenderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.Recipient)
            .WithMany()
            .HasForeignKey(c => c.RecipientId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
