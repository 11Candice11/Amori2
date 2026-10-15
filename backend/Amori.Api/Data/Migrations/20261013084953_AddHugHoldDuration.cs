using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amori.Api.Data.Migrations
{
    /// <summary>
    /// Records how long the sender held the button down when sending a hug.
    ///
    /// Sending is a press-and-hold gesture, so the app already measures this;
    /// storing it lets a deliberate, lingering hug earn more than a tap, which
    /// is what gives the long-dormant "hug held" activity something real to
    /// trigger on.
    ///
    /// Nullable: existing hugs have no recorded duration, and clients that
    /// predate the field simply won't send it.
    /// </summary>
    public partial class AddHugHoldDuration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder) =>
            migrationBuilder.Sql("""
                ALTER TABLE hugs ADD COLUMN IF NOT EXISTS hold_duration_ms integer NULL;
                """);

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder) =>
            migrationBuilder.Sql("""
                ALTER TABLE hugs DROP COLUMN IF EXISTS hold_duration_ms;
                """);
    }
}
