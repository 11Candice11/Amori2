using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHugOffsetsAndHistoryBackfill : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "last_known_utc_offset_minutes",
                table: "users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "recipient_utc_offset_minutes",
                table: "hugs",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "sender_utc_offset_minutes",
                table: "hugs",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_points_history_user_history_backfill",
                table: "points_history",
                columns: new[] { "user_id", "activity_type" },
                unique: true,
                filter: "activity_type = 12");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_points_history_user_history_backfill",
                table: "points_history");

            migrationBuilder.DropColumn(
                name: "last_known_utc_offset_minutes",
                table: "users");

            migrationBuilder.DropColumn(
                name: "recipient_utc_offset_minutes",
                table: "hugs");

            migrationBuilder.DropColumn(
                name: "sender_utc_offset_minutes",
                table: "hugs");
        }
    }
}
