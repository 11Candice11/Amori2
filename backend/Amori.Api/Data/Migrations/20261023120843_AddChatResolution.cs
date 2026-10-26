using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddChatResolution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "resolution",
                table: "chat_conversations",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "resolved_at",
                table: "chat_conversations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "resolved_by_id",
                table: "chat_conversations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_chat_conversations_resolved_by_id",
                table: "chat_conversations",
                column: "resolved_by_id");

            migrationBuilder.AddForeignKey(
                name: "FK_chat_conversations_users_resolved_by_id",
                table: "chat_conversations",
                column: "resolved_by_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_chat_conversations_users_resolved_by_id",
                table: "chat_conversations");

            migrationBuilder.DropIndex(
                name: "IX_chat_conversations_resolved_by_id",
                table: "chat_conversations");

            migrationBuilder.DropColumn(
                name: "resolution",
                table: "chat_conversations");

            migrationBuilder.DropColumn(
                name: "resolved_at",
                table: "chat_conversations");

            migrationBuilder.DropColumn(
                name: "resolved_by_id",
                table: "chat_conversations");
        }
    }
}
