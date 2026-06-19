export const COUNTRY_NAMES: Record<string, string> = {
  US: 'USA', TH: 'Thailand', GB: 'United Kingdom', JP: 'Japan', CN: 'China',
  IN: 'India', DE: 'Germany', FR: 'France', AU: 'Australia', CA: 'Canada',
  SG: 'Singapore', KR: 'South Korea', BR: 'Brazil', MX: 'Mexico', ID: 'Indonesia',
  VN: 'Vietnam', MY: 'Malaysia', PH: 'Philippines', NL: 'Netherlands', IT: 'Italy',
  ES: 'Spain', RU: 'Russia', PL: 'Poland', SE: 'Sweden', NO: 'Norway',
  DK: 'Denmark', FI: 'Finland', CH: 'Switzerland', AT: 'Austria', BE: 'Belgium',
};

export function parseDevice(userAgent = ''): string {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('iphone')) os = 'iOS';
  else if (ua.includes('ipad')) os = 'iPadOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('mac os x') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  let browser = 'Unknown';
  if (ua.includes('edg/') || ua.includes('edge/')) browser = 'Edge';
  else if (ua.includes('opr/') || ua.includes('opera')) browser = 'Opera';
  else if (ua.includes('firefox') || ua.includes('fxios')) browser = 'Firefox';
  else if (ua.includes('chrome') || ua.includes('crios')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  return `${browser} / ${os}`;
}
