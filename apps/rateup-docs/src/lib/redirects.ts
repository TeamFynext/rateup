/**
 * Old docs URLs → their current home. One map for every rename, so links shared before a
 * rename keep working.
 *
 * Every rule is prefix-aware: a key matches itself and everything below it
 * (`/web-forms` also matches `/web-forms/logic-and-variables`), and the longest matching
 * key wins. Rules chain, so `/web-forms/creating-a-form` → `/surveys/creating-a-form` →
 * `/surveys/creating-a-survey`. When an old URL lands on a page that no longer exists, it
 * falls back to the nearest existing parent (`/loyality/cashier-portal/quick-actions` →
 * `/loyalty/cashier-portal`).
 *
 * Only consulted when no page exists at the requested path, so a rule can never hide a
 * real page. Add a row whenever a page or folder is renamed.
 */
export const REDIRECTS: Record<string, string> = {
  // 2026-10-30 feature renames + sidebar regroup
  '/whatsapp/chatbots': '/automation/journeys',
  '/whatsapp/chatbot-builder': '/automation/journey-builder',
  '/instagram/chatbots': '/instagram/journeys',
  '/messenger/chatbots': '/messenger/journeys',
  '/whatsapp/conversational-components': '/whatsapp/ice-breakers',
  '/web-forms': '/surveys',
  '/surveys/creating-a-form': '/surveys/creating-a-survey',
  '/testimonials': '/surveys/testimonials',
  '/testimonial': '/surveys/testimonials',
  '/qr-studio': '/qr-links',
  '/qr-links/qr-creator': '/qr-links/qr-codes',
  '/qr-links/access-links': '/qr-links/link-in-bio-pages',
  '/contacts/groups': '/contacts/audiences',
  '/analytics/message-logs': '/analytics/message-log',
  '/analytics/message-analytics': '/analytics/template-delivery',
  '/analytics/calls': '/inbox/calls',
  '/analytics/team-activity': '/settings/audit-log',
  '/settings/account': '/settings/profile',
  '/settings/security': '/settings/password',
  '/settings/users': '/settings/members',
  '/settings/features': '/settings/customize-menu',
  '/campaign': '/campaigns',
  '/pipeline': '/pipelines',
  '/loyalty/customers': '/loyalty/members',
  '/loyalty/dashboard': '/loyalty/overview',
  '/meta-agent/overview': '/meta-agent/setup-guide',
  '/meta-agent/ui-skills': '/meta-agent/rich-replies',
  '/meta-agent/operate': '/meta-agent/test',
  '/meta-agent/settings': '/meta-agent/go-live',
  '/inbox/inboxview/newchat': '/inbox/inboxview/unassigned',
  '/inbox/inboxview/mine': '/inbox/inboxview/assigned-to-me',
  '/inbox/inboxview/favourites': '/inbox/inboxview/starred',
  '/inbox/inboxview/mentions': '/inbox/inboxview/unread-mentions',
  '/inbox/inboxview/spam': '/inbox/inboxview/spam-contacts',

  // Older renames that were never redirected
  '/loyality': '/loyalty',
  '/loyalty/transctions': '/loyalty/transactions',
  '/loyalty/settings/notification-settings': '/loyalty/notifications',
  '/web-survey': '/surveys',
  '/web-survey/editsurvey/questiontypes': '/surveys/question-types',
  '/web-survey/editsurvey': '/surveys/creating-a-survey',
  '/web-survey/surveytemplates': '/surveys/creating-a-survey',
  '/web-survey/surveytheme': '/surveys/design',
  '/web-survey/sharesurvey': '/surveys/sharing',
  '/web-survey/result': '/surveys/results',
  '/advanced-features': '/surveys',
  '/advanced-features/customvalidation': '/surveys/question-types',
  '/advanced-features/logicjump': '/surveys/logic-and-variables',
  '/advanced-features/variables': '/surveys/logic-and-variables',
  '/advanced-features/resultexport': '/surveys/results',
  '/advanced-features/googlereview': '/loyalty/feedback',
  '/advanced-features/overview': '/surveys',
  // Deep links older app builds sent from their info buttons
  '/advancedFt': '/surveys',
  '/advancedFt/resultexport': '/surveys/results',
  '/webSurvey': '/surveys',
  '/webSurvey/shareSurvey': '/surveys/sharing',
  '/webSurvey/surveyTemplates': '/surveys/creating-a-survey',
  '/loyalty/earningRules': '/loyalty/program',
};

const KEYS = Object.keys(REDIRECTS).sort((a, b) => b.length - a.length);

function normalise(path: string): string {
  const p = `/${path.replace(/^\/+|\/+$/g, '')}`;
  return p === '/' ? p : p.replace(/\/{2,}/g, '/');
}

/** Applies the longest matching rule to `path`, or returns null when none matches. */
function applyRule(path: string): string | null {
  for (const key of KEYS) {
    if (path === key || path.startsWith(`${key}/`)) return REDIRECTS[key] + path.slice(key.length);
  }
  return null;
}

/**
 * Where an old docs path lives now, or null when it is not an old path (a real 404).
 * `exists` says whether a page exists at a path (e.g. `/surveys/logic-and-variables`).
 */
export function resolveRedirect(path: string, exists: (path: string) => boolean): string | null {
  let current = normalise(path);
  let mapped = false;
  for (let i = 0; i < 20; i++) {
    if (exists(current)) return mapped ? current : null;
    const next = applyRule(current);
    if (next !== null && next !== current) {
      current = next;
      mapped = true;
      continue;
    }
    // An old URL whose exact page is gone: fall back to the nearest existing parent.
    if (!mapped || current === '/') return null;
    current = current.slice(0, current.lastIndexOf('/')) || '/';
  }
  return null;
}
