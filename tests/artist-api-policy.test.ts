import assert from "node:assert/strict";
import test from "node:test";
import {
  ARTIST_API_SCOPES,
  assetWhereForStudio,
  hasArtistApiScopes,
  normalizeArtistApiScopes,
  projectWhereForStudio,
} from "../src/artist-api-policy.ts";

test("omitted key scopes retain the current API contract", () => {
  assert.deepEqual(normalizeArtistApiScopes(undefined), [...ARTIST_API_SCOPES]);
});

test("scope checks deny operations absent from a key", () => {
  const granted = normalizeArtistApiScopes(["projects:read", "assets:write"]);
  assert.equal(hasArtistApiScopes(granted, ["assets:write"]), true);
  assert.equal(hasArtistApiScopes(granted, ["publications:write"]), false);
});

test("studio predicates keep project and asset IDs inside one studio", () => {
  assert.deepEqual(projectWhereForStudio("studio-a", "project-1"), {
    id: "project-1",
    studioId: "studio-a",
  });
  assert.deepEqual(assetWhereForStudio("studio-a", "asset-1"), {
    id: "asset-1",
    project: { studioId: "studio-a" },
  });
  assert.notDeepEqual(
    assetWhereForStudio("studio-a", "asset-1"),
    assetWhereForStudio("studio-b", "asset-1"),
  );
});
