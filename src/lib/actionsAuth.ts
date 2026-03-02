import { NextRequest } from "next/server";

export function requireActionsKey(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!process.env.ACTIONS_API_KEY) {
    return { ok: false, status: 500, message: "Server not configured" };
  }

  if (!authHeader) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const token = authHeader.replace("Bearer ", "");

  if (token !== process.env.ACTIONS_API_KEY) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  return { ok: true };
}