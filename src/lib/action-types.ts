export type ActionResult<T = undefined> = { ok: true; msg?: string; data?: T } | { ok: false; error: string };
