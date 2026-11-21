// Deterministic safety layer for the parent chat. The model prompt asks for safe behavior, but a prompt is a
// request, not a guarantee. These checks run in code, before and after the model, so the most important
// behaviors (crisis resources, no calorie/weight talk, no diagnosing) hold even if the model slips.
//
// Pattern lists are deliberately small and conservative: false positives only show a caring message,
// but false negatives matter, so when adding patterns prefer recall and add a test for each.

const EMERGENCY = [
  /\bsuicid/i,
  /\bkill(ing)? (myself|himself|herself|themselves|themself)\b/i,
  /\bwant(s|ed)? to die\b/i,
  /\bend(ing)? (it all|their life|his life|her life|my life)\b/i,
  /\b(self[- ]?harm|hurt(ing)? (myself|himself|herself|themselves)|cutting (myself|himself|herself|themselves))\b/i,
  /\b(faint(ed|ing)?|passed? out|passing out|collaps(ed|ing)|unresponsive|won'?t wake up)\b/i,
  /\bchest (pain|tightness|pressure)\b/i,
  /\b(can'?t|cannot|trouble|difficulty) breath/i,
  /\bseizure/i,
]

const URGENT = [
  /\bpurg(e|ed|ing)\b/i,
  /\bthr(ew|ow|owing) up (on purpose|after (eating|every|each)|deliberately)\b/i,
  /\bmak(e|es|ing|made) (him|her|them)(self|selves)? (throw up|vomit|sick)\b/i,
  /\blaxative/i,
  /\b((hasn'?t|haven'?t|has not|have not) eaten|(didn'?t|did not) eat)\b.{0,40}\b(all day|today|yesterday|two days|2 days|three days|3 days|since)\b/i,
  /\b(refus(ed|es|ing)|won'?t|will not) (to )?(eat|drink)\b.{0,40}\b(all|anything|day|days|water|fluids)\b/i,
  /\bnot drinking\b/i,
]

export const CRISIS_MESSAGE =
  "I'm really glad you told me. If anyone is in immediate danger, or someone has fainted, has chest pain, or " +
  "is struggling to breathe, please call 911 now. For thoughts of suicide or self-harm, call or text 988 " +
  "(Suicide & Crisis Lifeline) any time. I can't replace emergency help, but you can also tap SOS here and " +
  "I'll let your care team know you need support."

export const URGENT_MESSAGE =
  "Thank you for telling me, that sounds worrying. This is something your care team should hear about " +
  "today, so please contact them directly. I can also send them an SOS from here. If things feel " +
  "unsafe or you see fainting, chest pain, or trouble breathing, call 911."

export const FALLBACK_MESSAGE =
  "I'm not able to help with that one. Your care team is the right person to ask. Want me to flag it for them?"

/** @returns {'emergency' | 'urgent' | null} How serious the user's message looks. */
export function classifyUserMessage(text) {
  if (typeof text !== 'string' || !text.trim()) return null
  if (EMERGENCY.some(re => re.test(text))) return 'emergency'
  if (URGENT.some(re => re.test(text))) return 'urgent'
  return null
}

/** Fixed (model-free) reply for a risky user message, or null if the message is fine to send to the model. */
export function safetyReplyFor(text) {
  const level = classifyUserMessage(text)
  if (level === 'emergency') return CRISIS_MESSAGE
  if (level === 'urgent') return URGENT_MESSAGE
  return null
}

const BLOCKED_REPLY = [
  // calorie / weight / body numbers
  /\b\d+(\.\d+)?\s*(k?cals?|calories|kilocalories)\b/i,
  /\b\d+(\.\d+)?\s*(lbs?|pounds|kg|kilograms)\b/i,
  /\bBMI\b/i,
  // restriction, compensation, weight-loss framing
  /\bburn(ing)?( it| them)? off\b/i,
  /\b(lose|losing|drop|dropping) (some )?weight\b/i,
  /\bweight[- ]loss\b/i,
  /\b(cut|cutting|reduce|reducing) (back )?(on )?(calories|portions|carbs)\b/i,
  /\bskip(ping)? (a |the )?(meal|breakfast|lunch|dinner|snack)s?\b/i,
  // diagnosing
  /\b(is|are|has|have|sounds like|looks like)\s+(\w+\s+){0,2}(anorexi[ac]|bulimi[ac]|arfid|binge[- ]eating disorder)\b/i,
]

/** True if a model reply breaks the rules in AGENTS.md (numbers to restrict, weight-loss framing, diagnosis). */
export function violatesReplyPolicy(text) {
  return typeof text === 'string' && BLOCKED_REPLY.some(re => re.test(text))
}

/** Pass a model reply through the policy; unsafe replies are replaced with a safe redirect. */
export function enforceReplyPolicy(text) {
  return violatesReplyPolicy(text) ? FALLBACK_MESSAGE : text
}
