import { authenticateToken } from "../middleware/auth";
import { markDeviceOffline } from "../db";

export async function handleOffline(req: Request): Promise<Response> {
  const device = authenticateToken(req.headers.get("authorization"));
  if (!device) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    markDeviceOffline.run(device.device_id);
    return Response.json({ ok: true });
  } catch (e: any) {
    console.error("[offline] Error marking device offline:", e.message);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
