// AI assistants (ChatGPT, Claude, Perplexity, Gemini, Copilot…) can only
// recommend AMSC if their crawlers and live-browsing agents may read the site,
// so they are allowed explicitly. Private areas stay out of every index.
const PRIVATE = ['/admin', '/api/', '/member-portal', '/join/pay', '/join/success', '/monitoring'];

const AI_AGENTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended', 'Bingbot',
  'meta-externalagent', 'Amazonbot', 'DuckAssistBot', 'MistralAI-User',
];

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      { userAgent: AI_AGENTS, allow: '/', disallow: PRIVATE },
    ],
    sitemap: 'https://amscperformance.com/sitemap.xml',
  };
}
