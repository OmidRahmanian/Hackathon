import { getLeaderboard } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const updatedAt = Math.floor(Date.now() / 1000);

  const rows = await getLeaderboard();
  const entries =
    rows.length > 0
      ? rows.map((row) => ({
          name: row.username,
          streakDays: row.streak,
          // TODO: map DB score once available; using rank as placeholder score.
          score: row.rank,
        }))
      : [
          // Fallback keeps endpoint stable if DB is unavailable.
          { name: "Gigi", streakDays: 3, score: 120 },
          { name: "Sahand", streakDays: 2, score: 90 },
          { name: "Omid", streakDays: 1, score: 60 },
        ];

  return Response.json({
    updatedAt,
    entries,
  });
}
