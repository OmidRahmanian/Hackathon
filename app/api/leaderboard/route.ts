export const runtime = "nodejs";

export async function GET() {
  const updatedAt = Math.floor(Date.now() / 1000);

  return Response.json({
    updatedAt,
    entries: [
      { name: "Gigi", streakDays: 3, score: 120 },
      { name: "Sahand", streakDays: 2, score: 90 },
      { name: "Omid", streakDays: 1, score: 60 },
    ],
  });
}
