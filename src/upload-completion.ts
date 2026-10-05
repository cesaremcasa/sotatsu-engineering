export type UploadCompletionAction =
  | "claim"
  | "requeue"
  | "recover"
  | "expire"
  | "conflict";

export function uploadCompletionAction(
  status: string,
  expiresAt: Date,
  now = new Date(),
): UploadCompletionAction {
  if (status === "RECEIVED") return "requeue";
  if (status === "FAILED") return "recover";
  if (status !== "PENDING") return "conflict";
  return expiresAt.getTime() < now.getTime() ? "expire" : "claim";
}

export function workIdFromLegacyUploadKey(
  key: string,
  userId: string,
): string | null {
  const prefix = `raw/${userId}/`;
  if (!key.startsWith(prefix)) return null;
  const fileName = key.slice(prefix.length);
  if (!fileName || fileName.includes("/")) return null;
  const extensionAt = fileName.lastIndexOf(".");
  if (extensionAt <= 0 || extensionAt === fileName.length - 1) return null;
  return fileName.slice(0, extensionAt);
}
