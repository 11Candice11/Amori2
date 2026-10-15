using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <summary>
    /// Brings the gamification tables (<c>user_points</c>, <c>points_history</c>,
    /// <c>badges</c>) under migration control.
    ///
    /// These three were mapped in code — entities, EF configurations and DbSets
    /// all existed — but no migration ever created them and they were absent
    /// from the model snapshot. Deployed databases nevertheless have them (the
    /// API queries <c>user_points</c> on every <c>GET /api/users/me</c>, which
    /// would otherwise fail), so they were created outside the migration
    /// history at some point.
    ///
    /// That means this migration has to cope with both situations: a fresh
    /// database where the tables are missing, and an existing one where they
    /// are already present. <c>Program.cs</c> runs <c>MigrateAsync()</c> on
    /// startup, so a plain <c>CreateTable</c> here would throw "relation
    /// already exists" and take the API down on the next deploy. Everything is
    /// therefore written as idempotent raw SQL — the same approach as
    /// <c>SyncMemoryMediaAndUserSettingsColumns</c>.
    ///
    /// Column types, defaults and index names match what the EF configurations
    /// produce, so the snapshot this migration ships with stays authoritative.
    /// </summary>
    public partial class AddGamificationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── user_points ───────────────────────────────────────────────────
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS user_points (
                    id                   uuid NOT NULL,
                    user_id              uuid NOT NULL,
                    total_points         integer NOT NULL DEFAULT 0,
                    level                integer NOT NULL DEFAULT 1,
                    last_points_added_at timestamp with time zone NULL,
                    created_at           timestamp with time zone NOT NULL,
                    updated_at           timestamp with time zone NULL,
                    CONSTRAINT "PK_user_points" PRIMARY KEY (id),
                    CONSTRAINT "FK_user_points_users_user_id" FOREIGN KEY (user_id)
                        REFERENCES users (id) ON DELETE CASCADE
                );
                """);

            migrationBuilder.Sql("""
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_user_points_user_id"
                    ON user_points (user_id);
                """);

            // ── points_history ────────────────────────────────────────────────
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS points_history (
                    id                 uuid NOT NULL,
                    user_id            uuid NOT NULL,
                    activity_type      integer NOT NULL,
                    points_awarded     integer NOT NULL,
                    total_points_after integer NOT NULL,
                    reference_id       uuid NULL,
                    metadata           character varying(1000) NULL,
                    created_at         timestamp with time zone NOT NULL,
                    updated_at         timestamp with time zone NULL,
                    CONSTRAINT "PK_points_history" PRIMARY KEY (id),
                    CONSTRAINT "FK_points_history_users_user_id" FOREIGN KEY (user_id)
                        REFERENCES users (id) ON DELETE CASCADE
                );
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_points_history_user_id"
                    ON points_history (user_id);
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_points_history_created_at"
                    ON points_history (created_at);
                """);

            // ── badges ────────────────────────────────────────────────────────
            // Level-milestone badges only, for now. The achievements spec
            // replaces this with a seeded catalogue (badge_definitions) plus a
            // user_badges join table; this table is dropped at that point.
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS badges (
                    id                   uuid NOT NULL,
                    user_id              uuid NOT NULL,
                    badge_name           character varying(255) NOT NULL,
                    description          character varying(500) NOT NULL,
                    awarded_at_level     integer NOT NULL,
                    image_key            character varying(255) NULL,
                    image_url            character varying(1000) NULL,
                    is_archived_in_vault boolean NOT NULL DEFAULT FALSE,
                    earned_at            timestamp with time zone NOT NULL,
                    created_at           timestamp with time zone NOT NULL,
                    updated_at           timestamp with time zone NULL,
                    CONSTRAINT "PK_badges" PRIMARY KEY (id),
                    CONSTRAINT "FK_badges_users_user_id" FOREIGN KEY (user_id)
                        REFERENCES users (id) ON DELETE CASCADE
                );
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_badges_user_id"
                    ON badges (user_id);
                """);

            // Guards against awarding the same level badge twice.
            migrationBuilder.Sql("""
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_badges_user_level"
                    ON badges (user_id, awarded_at_level);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS badges;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS points_history;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS user_points;");
        }
    }
}
