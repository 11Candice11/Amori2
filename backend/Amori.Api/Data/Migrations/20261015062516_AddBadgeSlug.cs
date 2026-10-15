using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBadgeSlug : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_badges_user_level",
                table: "badges");

            migrationBuilder.AddColumn<string>(
                name: "slug",
                table: "badges",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_badges_user_level",
                table: "badges",
                columns: new[] { "user_id", "awarded_at_level" },
                unique: true,
                filter: "slug IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_badges_user_slug",
                table: "badges",
                columns: new[] { "user_id", "slug" },
                unique: true,
                filter: "slug IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_badges_user_level",
                table: "badges");

            migrationBuilder.DropIndex(
                name: "IX_badges_user_slug",
                table: "badges");

            migrationBuilder.DropColumn(
                name: "slug",
                table: "badges");

            migrationBuilder.CreateIndex(
                name: "IX_badges_user_level",
                table: "badges",
                columns: new[] { "user_id", "awarded_at_level" },
                unique: true);
        }
    }
}
