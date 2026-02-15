import { getLeaderboard } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const updatedAt = Math.floor(Date.now() / 1000);

  const rows = await getLeaderboard();
  const entries =
    rows.length > 0
      ? rows.map((row) => ({
          name: row.username ?? "Unknown",
          score: row.score ?? 0,
        }))
      : [
          // Fallback keeps endpoint stable if DB is unavailable.
          { name: "Gigi", score: 120 },
          { name: "Sahand", score: 90 },
          { name: "Omid", score: 60 },
        ];

  return Response.json({
    updatedAt,
    entries,
  });
}
