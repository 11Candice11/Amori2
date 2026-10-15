using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <summary>
    /// Records the user's own calendar date against each points entry, so
    /// once-a-day rules (the daily check-in, opening the daily gift) can be
    /// enforced against the day the user is actually living in rather than the
    /// UTC day.
    ///
    /// Nullable: rows written before this column existed have no local date,
    /// and the once-a-day guard treats them as not-today, which is the safe
    /// direction — a user might be credited once more than they strictly should
    /// have been on the day of deployment, rather than being locked out of a
    /// ritual they haven't performed yet.
    ///
    /// Written as idempotent SQL for the same reason as
    /// <c>AddGamificationTables</c>: these tables exist in deployed databases
    /// outside the migration history, so this has to tolerate a column that is
    /// somehow already there without taking the API down on boot.
    /// </summary>
    public partial class AddPointsHistoryLocalDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE points_history ADD COLUMN IF NOT EXISTS local_date date NULL;
                """);

            // Backs the (user, activity, local date) lookup the guard performs
            // on every daily award.
            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_points_history_user_activity_local_date"
                    ON points_history (user_id, activity_type, local_date);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP INDEX IF EXISTS "IX_points_history_user_activity_local_date";
                """);

            migrationBuilder.Sql("""
                ALTER TABLE points_history DROP COLUMN IF EXISTS local_date;
                """);
        }
    }
}
