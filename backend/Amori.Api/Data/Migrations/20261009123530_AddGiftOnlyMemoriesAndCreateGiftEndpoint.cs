using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGiftOnlyMemoriesAndCreateGiftEndpoint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "VisionBoardItemId",
                table: "vault_gifts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsGiftOnly",
                table: "memories",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_vault_gifts_VisionBoardItemId",
                table: "vault_gifts",
                column: "VisionBoardItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_vault_gifts_vision_board_items_VisionBoardItemId",
                table: "vault_gifts",
                column: "VisionBoardItemId",
                principalTable: "vision_board_items",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_vault_gifts_vision_board_items_VisionBoardItemId",
                table: "vault_gifts");

            migrationBuilder.DropIndex(
                name: "IX_vault_gifts_VisionBoardItemId",
                table: "vault_gifts");

            migrationBuilder.DropColumn(
                name: "VisionBoardItemId",
                table: "vault_gifts");

            migrationBuilder.DropColumn(
                name: "IsGiftOnly",
                table: "memories");
        }
    }
}
