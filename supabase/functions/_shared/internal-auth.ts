// @ts-nocheck
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: JSON_HEADERS,
  });
}

export function requireInternalCaller(req: Request): Response | null {
  const expectedToken = Deno.env.get('INTERNAL_FUNCTION_TOKEN');
  if (!expectedToken) {
    return jsonError('Internal function auth misconfigured', 500);
  }

  const providedToken = req.headers.get('x-internal-token');
  if (!providedToken || providedToken !== expectedToken) {
    return jsonError('Unauthorized', 401);
  }

  return null;
}
