
// This is a local shim for the deprecated "https://deno.land/std/http/server.ts" module.
// It uses the modern Deno.serve API under the hood.

export function serve(handler: (req: Request) => Response | Promise<Response>) {
  (globalThis as any).Deno.serve(handler);
}
