import { NextRequest } from "next/server";

export function requireActionsKey(req: NextRequest) {
  const key = req.headers.get("x-api-key");
  const expected = process.env.ACTIONS_API_KEY;

  if (!expected) {
    return { ok: false, status: 500, message: "Server missing ACTIONS_API_KEY" };
  }

  if (!key || key !== expected) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  return { ok: true as const };
}