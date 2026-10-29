const FACE_HASH_PREFIX = "face-";

export function faceIdToHash(id: string): string {
  if (id.startsWith(FACE_HASH_PREFIX)) return id;
  return `${FACE_HASH_PREFIX}${id}`;
}

export function getFaceIdFromHash(knownFaceIds?: string[]): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;

  if (knownFaceIds && knownFaceIds.length > 0) {
    const slideNumber = Number(hash);
    if (
      Number.isInteger(slideNumber) &&
      slideNumber >= 1 &&
      slideNumber <= knownFaceIds.length
    ) {
      return knownFaceIds[slideNumber - 1];
    }

    const match = knownFaceIds.find((id) => faceIdToHash(id) === hash);
    if (match) return match;
    return null;
  }

  if (!hash.startsWith(FACE_HASH_PREFIX)) return null;
  const stripped = hash.slice(FACE_HASH_PREFIX.length);
  return stripped || null;
}

export function setFaceIdInHash(
  faceId: string | null,
  options: { silent?: boolean } = {},
  knownFaceIds?: string[],
): void {
  if (typeof window === "undefined") return;
  let nextHash = "";
  if (faceId) {
    if (knownFaceIds) {
      const index = knownFaceIds.indexOf(faceId);
      nextHash = index === -1 ? "" : `#${index + 1}`;
    } else {
      nextHash = `#${faceIdToHash(faceId)}`;
    }
  }
  if (window.location.hash === nextHash) return;

  // Keep the existing state: the site's router stores its entry key and
  // history index there, and a null state resets both.
  const url = new URL(window.location.href);
  url.hash = nextHash;
  window.history.replaceState(window.history.state, "", url.toString());

  if (!options.silent) {
    window.dispatchEvent(new Event("hashchange"));
  }
}
