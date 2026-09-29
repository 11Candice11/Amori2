using System;
using Amori.Api.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVisionBoardAndSupportProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "support_profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    who_i_am = table.Column<WhoIAmSection>(type: "jsonb", nullable: false),
                    what_i_like = table.Column<WhatILikeSection>(type: "jsonb", nullable: false),
                    favorites = table.Column<FavoritesSection>(type: "jsonb", nullable: false),
                    how_to_help_me = table.Column<HowToHelpMeSection>(type: "jsonb", nullable: false),
                    things_to_know = table.Column<ThingsToKnowSection>(type: "jsonb", nullable: false),
                    boundaries = table.Column<BoundariesSection>(type: "jsonb", nullable: false),
                    little_things = table.Column<LittleThingsSection>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_support_profiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_support_profiles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "vision_board_sections",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    relationship_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    cover_image_file_key = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_default = table.Column<bool>(type: "boolean", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vision_board_sections", x => x.id);
                    table.ForeignKey(
                        name: "FK_vision_board_sections_relationships_relationship_id",
                        column: x => x.relationship_id,
                        principalTable: "relationships",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "vision_board_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    relationship_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    section_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    type = table.Column<int>(type: "integer", nullable: false),
                    image_file_key = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    location_name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true),
                    target_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    budget = table.Column<decimal>(type: "numeric(14,2)", nullable: true),
                    external_reference = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    is_pinned = table.Column<bool>(type: "boolean", nullable: false),
                    is_completed = table.Column<bool>(type: "boolean", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vision_board_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_vision_board_items_relationships_relationship_id",
                        column: x => x.relationship_id,
                        principalTable: "relationships",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_vision_board_items_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_vision_board_items_vision_board_sections_section_id",
                        column: x => x.section_id,
                        principalTable: "vision_board_sections",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_support_profiles_user_id",
                table: "support_profiles",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vision_board_items_created_by_user_id",
                table: "vision_board_items",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_vision_board_items_is_deleted",
                table: "vision_board_items",
                column: "is_deleted");

            migrationBuilder.CreateIndex(
                name: "IX_vision_board_items_relationship_id",
                table: "vision_board_items",
                column: "relationship_id");

            migrationBuilder.CreateIndex(
                name: "IX_vision_board_items_section_id",
                table: "vision_board_items",
                column: "section_id");

            migrationBuilder.CreateIndex(
                name: "IX_vision_board_sections_is_deleted",
                table: "vision_board_sections",
                column: "is_deleted");

            migrationBuilder.CreateIndex(
                name: "IX_vision_board_sections_relationship_id",
                table: "vision_board_sections",
                column: "relationship_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "support_profiles");

            migrationBuilder.DropTable(
                name: "vision_board_items");

            migrationBuilder.DropTable(
                name: "vision_board_sections");
        }
    }
}
