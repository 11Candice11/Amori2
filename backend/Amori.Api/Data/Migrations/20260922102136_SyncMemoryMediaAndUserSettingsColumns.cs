using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <summary>
    /// Reconciles the database schema with the EF model where columns existed in
    /// the model/snapshot but were never added to the database:
    ///   • memory_media.title / memory_media.thumbnail_url — the MemoryMedia entity
    ///     gained Title/ThumbnailUrl but no migration ever created the columns, so
    ///     every read of a memory's media (Include(m => m.Media)) 500'd with
    ///     "42703: column m0.ThumbnailUrl does not exist".
    ///   • user_settings.* — the enhanced settings columns were added to the model
    ///     but their hand-written migration was malformed (no Designer/snapshot
    ///     entry) so EF skipped it, leaving the columns absent in the database.
    ///
    /// Columns are added with IF NOT EXISTS so this is safe to run against any
    /// environment regardless of how far its schema had drifted.
    /// </summary>
    /// <inheritdoc />
    public partial class SyncMemoryMediaAndUserSettingsColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── memory_media ─────────────────────────────────────────────────────
            migrationBuilder.Sql(
                "ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS title character varying(200) NULL;");
            migrationBuilder.Sql(
                "ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS thumbnail_url character varying(1000) NULL;");

            // ── user_settings ────────────────────────────────────────────────────
            // Privacy & Sharing
            migrationBuilder.Sql(
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS share_check_ins boolean NOT NULL DEFAULT TRUE;");
            migrationBuilder.Sql(
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS share_location boolean NOT NULL DEFAULT TRUE;");
            migrationBuilder.Sql(
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS share_timeline boolean NOT NULL DEFAULT TRUE;");

            // Permissions
            migrationBuilder.Sql(
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS allow_hugs boolean NOT NULL DEFAULT TRUE;");
            migrationBuilder.Sql(
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS allow_emergency_alerts boolean NOT NULL DEFAULT TRUE;");
            migrationBuilder.Sql(
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS allow_partner_reminders boolean NOT NULL DEFAULT TRUE;");

            // Notifications
            migrationBuilder.Sql(
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT TRUE;");
            migrationBuilder.Sql(
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS check_in_reminders boolean NOT NULL DEFAULT TRUE;");
            migrationBuilder.Sql(
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS daily_digest boolean NOT NULL DEFAULT TRUE;");

            // App Preferences
            migrationBuilder.Sql(
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS sound_enabled boolean NOT NULL DEFAULT TRUE;");
            migrationBuilder.Sql(
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS vibration_enabled boolean NOT NULL DEFAULT TRUE;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // ── memory_media ─────────────────────────────────────────────────────
            migrationBuilder.Sql("ALTER TABLE memory_media DROP COLUMN IF EXISTS title;");
            migrationBuilder.Sql("ALTER TABLE memory_media DROP COLUMN IF EXISTS thumbnail_url;");

            // ── user_settings ────────────────────────────────────────────────────
            migrationBuilder.Sql("ALTER TABLE user_settings DROP COLUMN IF EXISTS share_check_ins;");
            migrationBuilder.Sql("ALTER TABLE user_settings DROP COLUMN IF EXISTS share_location;");
            migrationBuilder.Sql("ALTER TABLE user_settings DROP COLUMN IF EXISTS share_timeline;");
            migrationBuilder.Sql("ALTER TABLE user_settings DROP COLUMN IF EXISTS allow_hugs;");
            migrationBuilder.Sql("ALTER TABLE user_settings DROP COLUMN IF EXISTS allow_emergency_alerts;");
            migrationBuilder.Sql("ALTER TABLE user_settings DROP COLUMN IF EXISTS allow_partner_reminders;");
            migrationBuilder.Sql("ALTER TABLE user_settings DROP COLUMN IF EXISTS notifications_enabled;");
            migrationBuilder.Sql("ALTER TABLE user_settings DROP COLUMN IF EXISTS check_in_reminders;");
            migrationBuilder.Sql("ALTER TABLE user_settings DROP COLUMN IF EXISTS daily_digest;");
            migrationBuilder.Sql("ALTER TABLE user_settings DROP COLUMN IF EXISTS sound_enabled;");
            migrationBuilder.Sql("ALTER TABLE user_settings DROP COLUMN IF EXISTS vibration_enabled;");
        }
    }
}
