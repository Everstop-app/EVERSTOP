import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, weighStationStatusTable } from "@workspace/db";
import { SetWeighStationStatusBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/weigh-stations/status", async (_req, res) => {
  const rows = await db.select().from(weighStationStatusTable);
  res.json(rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })));
});

router.put("/weigh-stations/status/:osmId", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { osmId } = req.params;
  const body = SetWeighStationStatusBody.parse(req.body);

  const [row] = await db
    .insert(weighStationStatusTable)
    .values({ osmId, status: body.status })
    .onConflictDoUpdate({
      target: weighStationStatusTable.osmId,
      set: { status: body.status, updatedAt: new Date() },
    })
    .returning();

  res.json({ ...row, updatedAt: row.updatedAt.toISOString() });
});

export default router;
