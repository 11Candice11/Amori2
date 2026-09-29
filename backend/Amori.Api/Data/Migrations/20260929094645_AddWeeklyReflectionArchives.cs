using System;
using Amori.Api.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWeeklyReflectionArchives : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "weekly_reflection_archives",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    week_key = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    range_label = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    mood_data_partial = table.Column<bool>(type: "boolean", nullable: false),
                    snapshot = table.Column<WeeklyReflectionSnapshot>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_weekly_reflection_archives", x => x.id);
                    table.ForeignKey(
                        name: "FK_weekly_reflection_archives_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_weekly_reflection_archives_user_id_week_key",
                table: "weekly_reflection_archives",
                columns: new[] { "user_id", "week_key" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "weekly_reflection_archives");
        }
    }
}
