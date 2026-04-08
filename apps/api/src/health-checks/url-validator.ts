import { Resolver } from 'node:dns/promises';

const PRIVATE_RANGES = [
  // IPv4
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  // IPv6
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd00:/i,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((re) => re.test(ip));
}

export async function isUrlSafe(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return false;
  }

  if (isPrivateIp(parsed.hostname)) {
    return false;
  }

  // Resolve all DNS records to catch private IPs behind public hostnames
  const resolver = new Resolver();
  const addresses: string[] = [];

  try {
    const ipv4 = await resolver.resolve4(parsed.hostname);
    addresses.push(...ipv4);
  } catch {
    // No A records — not necessarily an error (may be IPv6-only)
  }

  try {
    const ipv6 = await resolver.resolve6(parsed.hostname);
    addresses.push(...ipv6);
  } catch {
    // No AAAA records
  }

  // If DNS resolved nothing, block — can't verify the target
  if (addresses.length === 0) {
    return false;
  }

  return !addresses.some(isPrivateIp);
}
