import "server-only";

/**
 * Twilio admite dos formas de autenticar:
 *   · API Key:   usuario = SK…, clave = secreto de la key
 *   · Clásica:   usuario = AC… (Account SID), clave = Auth Token
 * En ambos casos la URL necesita el Account SID (AC…), así que
 * TWILIO_ACCOUNT_SID es siempre obligatorio.
 */
function creds() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const from = process.env.TWILIO_FROM_NUMBER;
  const keySid = process.env.TWILIO_API_KEY_SID;
  const keySecret = process.env.TWILIO_API_KEY_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const user = keySid || accountSid;
  const pass = keySid ? keySecret : authToken;
  return { accountSid, from, user, pass };
}

/** ¿Están las credenciales de Twilio en el entorno? */
export function isTwilioConfigured(): boolean {
  const c = creds();
  return !!(c.accountSid && c.from && c.user && c.pass);
}

/**
 * Envía un SMS por la API REST de Twilio. Nunca lanza: si no hay
 * credenciales o el número es inválido, devuelve { ok: false } y el flujo
 * que lo llamó sigue normal (el booking jamás falla por un SMS).
 */
export async function sendSms(
  to: string,
  body: string
): Promise<{ ok: boolean; sid?: string; error?: string }> {
  if (!isTwilioConfigured()) return { ok: false, error: "not_configured" };
  const { accountSid, from, user, pass } = creds();

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${user}:${pass}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from!, Body: body }),
      }
    );
    const data = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) return { ok: false, error: data.message ?? `HTTP ${res.status}` };
    return { ok: true, sid: data.sid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
