using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDistractionUserContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "created_by_user_id",
                table: "would_you_rather_questions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "relationship_id",
                table: "would_you_rather_questions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "created_by_user_id",
                table: "quiz_questions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "hidden_object_puzzles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    relationship_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    image_file_key = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    prompt = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    target_x = table.Column<double>(type: "double precision", nullable: false),
                    target_y = table.Column<double>(type: "double precision", nullable: false),
                    target_radius = table.Column<double>(type: "double precision", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hidden_object_puzzles", x => x.id);
                    table.ForeignKey(
                        name: "FK_hidden_object_puzzles_relationships_relationship_id",
                        column: x => x.relationship_id,
                        principalTable: "relationships",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_hidden_object_puzzles_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_would_you_rather_questions_created_by_user_id",
                table: "would_you_rather_questions",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_would_you_rather_questions_relationship_id",
                table: "would_you_rather_questions",
                column: "relationship_id");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_questions_created_by_user_id",
                table: "quiz_questions",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_hidden_object_puzzles_created_by_user_id",
                table: "hidden_object_puzzles",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_hidden_object_puzzles_is_active",
                table: "hidden_object_puzzles",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "IX_hidden_object_puzzles_relationship_id",
                table: "hidden_object_puzzles",
                column: "relationship_id");

            migrationBuilder.AddForeignKey(
                name: "FK_quiz_questions_users_created_by_user_id",
                table: "quiz_questions",
                column: "created_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_would_you_rather_questions_relationships_relationship_id",
                table: "would_you_rather_questions",
                column: "relationship_id",
                principalTable: "relationships",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_would_you_rather_questions_users_created_by_user_id",
                table: "would_you_rather_questions",
                column: "created_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_quiz_questions_users_created_by_user_id",
                table: "quiz_questions");

            migrationBuilder.DropForeignKey(
                name: "FK_would_you_rather_questions_relationships_relationship_id",
                table: "would_you_rather_questions");

            migrationBuilder.DropForeignKey(
                name: "FK_would_you_rather_questions_users_created_by_user_id",
                table: "would_you_rather_questions");

            migrationBuilder.DropTable(
                name: "hidden_object_puzzles");

            migrationBuilder.DropIndex(
                name: "IX_would_you_rather_questions_created_by_user_id",
                table: "would_you_rather_questions");

            migrationBuilder.DropIndex(
                name: "IX_would_you_rather_questions_relationship_id",
                table: "would_you_rather_questions");

            migrationBuilder.DropIndex(
                name: "IX_quiz_questions_created_by_user_id",
                table: "quiz_questions");

            migrationBuilder.DropColumn(
                name: "created_by_user_id",
                table: "would_you_rather_questions");

            migrationBuilder.DropColumn(
                name: "relationship_id",
                table: "would_you_rather_questions");

            migrationBuilder.DropColumn(
                name: "created_by_user_id",
                table: "quiz_questions");
        }
    }
}
