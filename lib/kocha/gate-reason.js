/** Which notice the sign-in screen shows, from the page's search params. */
export function gateReason(searchParams = {}) {
  if (searchParams.signed_out) return 'signed_out';
  if (searchParams.link === 'invalid' || searchParams.link === 'error') return searchParams.link;
  return null;
}
