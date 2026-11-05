using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDateIdeaImageAndUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "image_key",
                table: "date_ideas",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "url",
                table: "date_ideas",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "image_key",
                table: "date_ideas");

            migrationBuilder.DropColumn(
                name: "url",
                table: "date_ideas");
        }
    }
}
