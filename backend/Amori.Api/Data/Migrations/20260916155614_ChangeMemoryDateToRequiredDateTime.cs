using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ChangeMemoryDateToRequiredDateTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add as nullable first so we can backfill existing rows, then
            // enforce NOT NULL. Existing memories inherit their date-time from
            // the previous date-only value (midnight) or their created_at.
            migrationBuilder.AddColumn<DateTime>(
                name: "memory_date_time",
                table: "memories",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE memories SET memory_date_time = " +
                "COALESCE(memory_date::timestamp with time zone, created_at);");

            migrationBuilder.AlterColumn<DateTime>(
                name: "memory_date_time",
                table: "memories",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "memory_date",
                table: "memories");

            migrationBuilder.CreateIndex(
                name: "IX_memories_memory_date_time",
                table: "memories",
                column: "memory_date_time");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_memories_memory_date_time",
                table: "memories");

            migrationBuilder.DropColumn(
                name: "memory_date_time",
                table: "memories");

            migrationBuilder.AddColumn<DateOnly>(
                name: "memory_date",
                table: "memories",
                type: "date",
                nullable: true);
        }
    }
}
