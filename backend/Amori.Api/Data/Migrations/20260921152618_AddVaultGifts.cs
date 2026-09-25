using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVaultGifts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "vault_gifts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    memory_id = table.Column<Guid>(type: "uuid", nullable: false),
                    card_number = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vault_gifts", x => x.id);
                    table.ForeignKey(
                        name: "FK_vault_gifts_memories_memory_id",
                        column: x => x.memory_id,
                        principalTable: "memories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_vault_gifts_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_vault_gifts_memory_id",
                table: "vault_gifts",
                column: "memory_id");

            migrationBuilder.CreateIndex(
                name: "IX_vault_gifts_user_id",
                table: "vault_gifts",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_vault_gifts_user_id_memory_id",
                table: "vault_gifts",
                columns: new[] { "user_id", "memory_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "vault_gifts");
        }
    }
}
