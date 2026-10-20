import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { workoutPlans } from "@/db/schema";
import { ensureUser } from "@/lib/auth";
import { jsonError, originError, readJson } from "@/lib/http";
import { planCreateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET() {
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  const plans = await db.select().from(workoutPlans).where(eq(workoutPlans.userId, user.id)).orderBy(desc(workoutPlans.updatedAt));
  return Response.json({ plans }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function POST(request: Request) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);

  const parsed = planCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Please check the plan details and try again.");
  const [plan] = await db.insert(workoutPlans).values({ ...parsed.data, userId: user.id, isSample: false }).returning();
  return Response.json({ plan }, { status: 201 });
}
