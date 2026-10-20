using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixVaultGiftVisionColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_vault_gifts_vision_board_items_VisionBoardItemId",
                table: "vault_gifts");

            migrationBuilder.RenameColumn(
                name: "VisionBoardItemId",
                table: "vault_gifts",
                newName: "vision_board_item_id");

            migrationBuilder.RenameIndex(
                name: "IX_vault_gifts_VisionBoardItemId",
                table: "vault_gifts",
                newName: "IX_vault_gifts_vision_board_item_id");

            migrationBuilder.AlterColumn<Guid>(
                name: "memory_id",
                table: "vault_gifts",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.CreateIndex(
                name: "IX_vault_gifts_user_id_vision_board_item_id",
                table: "vault_gifts",
                columns: new[] { "user_id", "vision_board_item_id" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_vault_gifts_vision_board_items_vision_board_item_id",
                table: "vault_gifts",
                column: "vision_board_item_id",
                principalTable: "vision_board_items",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_vault_gifts_vision_board_items_vision_board_item_id",
                table: "vault_gifts");

            migrationBuilder.DropIndex(
                name: "IX_vault_gifts_user_id_vision_board_item_id",
                table: "vault_gifts");

            migrationBuilder.RenameColumn(
                name: "vision_board_item_id",
                table: "vault_gifts",
                newName: "VisionBoardItemId");

            migrationBuilder.RenameIndex(
                name: "IX_vault_gifts_vision_board_item_id",
                table: "vault_gifts",
                newName: "IX_vault_gifts_VisionBoardItemId");

            migrationBuilder.AlterColumn<Guid>(
                name: "memory_id",
                table: "vault_gifts",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_vault_gifts_vision_board_items_VisionBoardItemId",
                table: "vault_gifts",
                column: "VisionBoardItemId",
                principalTable: "vision_board_items",
                principalColumn: "id");
        }
    }
}
