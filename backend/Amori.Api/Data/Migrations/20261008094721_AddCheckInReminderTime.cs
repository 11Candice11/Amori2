using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCheckInReminderTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CheckInReminderTime",
                table: "user_settings",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CheckInReminderTime",
                table: "user_settings");
        }
    }
}
