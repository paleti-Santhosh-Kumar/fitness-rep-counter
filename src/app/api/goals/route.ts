import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { ensureUser } from "@/lib/auth";
import { jsonError, originError, readJson } from "@/lib/http";
import { goalCreateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET() {
  const user = await ensureUser();
  const rows = await db.select().from(goals).where(eq(goals.userId, user.id)).orderBy(desc(goals.createdAt));
  return Response.json({ goals: rows }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function POST(request: Request) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  const parsed = goalCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Please check the goal details and try again.");
  const [goal] = await db.insert(goals).values({ ...parsed.data, userId: user.id }).returning();
  return Response.json({ goal }, { status: 201 });
}
