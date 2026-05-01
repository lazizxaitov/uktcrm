import path from "node:path";

export function getDbFilePath() {
  // Vercel filesystem is read-only except /tmp. Use /tmp for demo deployments.
  if (process.env.VERCEL) return path.join("/tmp", "uktcrm.sqlite");
  return path.join(process.cwd(), "data", "uktcrm.sqlite");
}

