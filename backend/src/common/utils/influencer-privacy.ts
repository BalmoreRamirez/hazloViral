/** Contact details shared as plain text. This does not inspect images or documents. */
const CONTACT_PATTERNS = [
  /[A-Z0-9._%+-]+\s*@\s*[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /(?:https?:\/\/)?(?:www\.)?(?:wa\.me|api\.whatsapp\.com|whatsapp\.com|t\.me|telegram\.me|instagram\.com|facebook\.com|fb\.com|m\.me|tiktok\.com|linkedin\.com|linktr\.ee|youtube\.com|youtu\.be|x\.com|twitter\.com|discord\.gg|discord\.com|snapchat\.com|threads\.net)\/[^\s<>]*/gi,
  /(?:^|\s)@[a-z0-9_.]{2,}/gi,
  /(?<![\w])(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{4}(?![\w])/g,
];
export function hideContactText(value: string): string {
  return CONTACT_PATTERNS.reduce((text, pattern) => text.replace(pattern, ' [contacto oculto]'), value);
}
export function containsContact(value: string): boolean {
  return hideContactText(value) !== value;
}

const PROFILE_KEYS = ['id', 'user_id', 'nombre_artistico', 'bio', 'ubicacion', 'rubros', 'tarifa_base', 'disponibilidad', 'is_verified', 'metrics', 'user'];
const METRIC_KEYS = ['id', 'red_social', 'seguidores', 'engagement_rate', 'is_verified', 'verified_at'];
const USER_KEYS = ['id', 'role', 'avatar_url'];
const PROFILE_TEXT_KEYS = new Set(['nombre_artistico', 'bio', 'ubicacion', 'influencer_nombre']);
const TEXT_KEYS = new Set(['nombre_artistico', 'bio', 'ubicacion', 'message_text', 'comentario', 'justificacion', 'influencer_nombre']);
function pick(value: Record<string, any>, keys: string[]) {
  return Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
}

/** Explicit allowlists prevent new private entity fields leaking through nested relations. */
export function protectInfluencerContact(value: any, ownUserId?: number): any {
  if (value === null || typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map(item => protectInfluencerContact(item, ownUserId));
  let source = value;
  if (value.operation_type === 'influencer_payout' && ownUserId !== undefined) {
    source = { ...value, customer_snapshot: { name: hideContactText(value.customer_snapshot?.name ?? 'Influencer') }, dte: null };
  }

  if ('nombre_artistico' in value && 'user_id' in value) {
    source = pick(value, PROFILE_KEYS);
    // Compute before removing verification prerequisites from the response.
    source.is_verified = value.is_verified ?? false;
  } else if ('red_social' in value && 'seguidores' in value) {
    source = pick(value, METRIC_KEYS);
  } else if ('email' in value && 'role' in value && value.id !== ownUserId) {
    source = pick(value, USER_KEYS);
  }
  return Object.fromEntries(Object.entries(source).map(([key, item]) => [key,
    TEXT_KEYS.has(key) && typeof item === 'string'
      ? (PROFILE_TEXT_KEYS.has(key) ? hideContactText(item).replace(/(?:https?:\/\/|www\.)[^\s<>]+/gi, '[enlace externo oculto]') : hideContactText(item))
      : protectInfluencerContact(item, ownUserId),
  ]));
}
