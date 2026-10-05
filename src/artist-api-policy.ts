export const ARTIST_API_SCOPES = [
  "projects:read",
  "projects:write",
  "assets:write",
  "publications:write",
] as const;

export type ArtistApiScope = (typeof ARTIST_API_SCOPES)[number];

export function normalizeArtistApiScopes(
  scopes: readonly ArtistApiScope[] | undefined,
): ArtistApiScope[] {
  return [...new Set(scopes ?? ARTIST_API_SCOPES)];
}

export function hasArtistApiScopes(
  granted: readonly string[],
  required: readonly ArtistApiScope[],
): boolean {
  return required.every((scope) => granted.includes(scope));
}

export function projectWhereForStudio(studioId: string, projectId: string) {
  return { id: projectId, studioId };
}

export function assetWhereForStudio(studioId: string, assetId: string) {
  return { id: assetId, project: { studioId } };
}
