export const blockedEmailDomains = [
  "tempmail.com",
  "10minutemail.com",
  "mailinator.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
  "fakeinbox.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "tempmail.dev",
  "mintemail.com",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
  "pokemail.net",
  "spamgourmet.com",
  "throwawaymail.com",
  "temp-mail.org",
  "emailondeck.com",
  "mytrashmail.com",
  "burnermail.io",
  "moakt.com",
  "tmpmail.org",
  "dropmail.me",
  "disposablemail.com",
  "bccto.me",
  "chacuo.net",
  "mailnesia.com",
  "spam4.me"
];

export function isBlockedEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return blockedEmailDomains.includes(domain);
}
