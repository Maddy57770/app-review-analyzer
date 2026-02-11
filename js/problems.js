// Problem categories with associated keywords and phrases
const PROBLEM_CATEGORIES = [
    {
        id: 'crashes', name: 'App Crashes & Freezing', icon: '💥',
        keywords: ['crash', 'crashed', 'crashes', 'crashing', 'freeze', 'freezes', 'freezing', 'froze', 'frozen', 'hang', 'hangs', 'hanging', 'stuck', 'unresponsive', 'force close', 'force quit', 'shut down', 'shuts down', 'stopped working', 'not responding', 'black screen', 'white screen']
    },
    {
        id: 'performance', name: 'Performance & Speed', icon: '🐌',
        keywords: ['slow', 'slower', 'slowest', 'lag', 'lags', 'lagging', 'laggy', 'sluggish', 'buffer', 'buffering', 'loading', 'takes forever', 'long time', 'wait', 'waiting', 'delay', 'delayed', 'delays', 'heavy', 'resource', 'memory', 'ram', 'cpu']
    },
    {
        id: 'bugs', name: 'Bugs & Glitches', icon: '🐛',
        keywords: ['bug', 'bugs', 'buggy', 'glitch', 'glitches', 'glitchy', 'error', 'errors', 'broken', 'break', 'breaks', 'breaking', 'defect', 'defects', 'fault', 'faulty', 'malfunction', 'issue', 'issues', 'problem', 'problems', 'not working', 'does not work', 'doesnt work', "doesn't work", 'fails', 'failed', 'failing']
    },
    {
        id: 'ui_ux', name: 'UI/UX Design Issues', icon: '🎨',
        keywords: ['ugly', 'confusing', 'confused', 'hard to use', 'difficult to use', 'complicated', 'unintuitive', 'not intuitive', 'bad design', 'poor design', 'layout', 'navigation', 'navigate', 'interface', 'cluttered', 'messy', 'small text', 'small font', 'hard to read', 'hard to find', 'too small', 'too big', 'redesign']
    },
    {
        id: 'battery', name: 'Battery & Resource Drain', icon: '🔋',
        keywords: ['battery', 'drain', 'draining', 'drains', 'drained', 'power', 'consumption', 'overheat', 'overheating', 'hot', 'heats up', 'heating', 'warm', 'energy']
    },
    {
        id: 'ads', name: 'Ads & Monetization', icon: '📢',
        keywords: ['ads', 'ad', 'advertisement', 'advertisements', 'advertising', 'popup', 'popups', 'pop-up', 'pop-ups', 'banner', 'banners', 'intrusive', 'annoying ads', 'too many ads', 'full screen ad', 'video ad', 'unskippable', 'pay to win', 'paywall', 'paywall', 'microtransaction', 'in-app purchase', 'subscription', 'overpriced', 'expensive', 'costly', 'money grab', 'cash grab', 'greedy', 'ripoff', 'rip-off', 'rip off']
    },
    {
        id: 'privacy', name: 'Privacy & Security', icon: '🔒',
        keywords: ['privacy', 'private', 'data', 'tracking', 'track', 'tracks', 'spy', 'spying', 'spyware', 'malware', 'virus', 'hack', 'hacked', 'hacking', 'security', 'insecure', 'unsafe', 'permission', 'permissions', 'access', 'collect', 'collecting', 'personal', 'identity', 'stolen', 'leak', 'leaked', 'breach', 'suspicious']
    },
    {
        id: 'updates', name: 'Update Issues', icon: '🔄',
        keywords: ['update', 'updated', 'updates', 'updating', 'new version', 'latest version', 'after update', 'since update', 'last update', 'recent update', 'downgrade', 'rollback', 'revert', 'old version', 'previous version', 'worse after', 'ruined', 'changed', 'removed feature', 'missing feature']
    },
    {
        id: 'login', name: 'Login & Account Issues', icon: '🔑',
        keywords: ['login', 'log in', 'signin', 'sign in', 'signup', 'sign up', 'register', 'registration', 'account', 'password', 'forgot password', 'reset password', 'verification', 'verify', 'otp', 'authentication', 'two factor', '2fa', 'locked out', 'cant login', "can't login", 'access denied', 'logout', 'log out', 'session']
    },
    {
        id: 'notifications', name: 'Notification Problems', icon: '🔔',
        keywords: ['notification', 'notifications', 'notify', 'alert', 'alerts', 'push notification', 'spam', 'spamming', 'spammy', 'too many notifications', 'constant', 'nonstop', 'annoying notification', 'unwanted', 'reminder', 'reminders']
    },
    {
        id: 'connectivity', name: 'Network & Connectivity', icon: '📡',
        keywords: ['connection', 'connect', 'connected', 'connecting', 'disconnect', 'disconnected', 'disconnects', 'offline', 'online', 'wifi', 'wi-fi', 'network', 'internet', 'server', 'servers', 'timeout', 'timed out', 'sync', 'syncing', 'synced', 'load', 'loading failed', 'cant connect', "can't connect", 'no connection']
    },
    {
        id: 'content', name: 'Content & Feature Gaps', icon: '📝',
        keywords: ['missing', 'lacks', 'lacking', 'limited', 'limitation', 'limitations', 'feature', 'features', 'need', 'needs', 'want', 'wanted', 'wish', 'wished', 'hoping', 'hope', 'add', 'should have', 'doesnt have', "doesn't have", 'no option', 'no way', 'basic', 'incomplete', 'half-baked', 'unfinished']
    },
    {
        id: 'support', name: 'Customer Support', icon: '🎧',
        keywords: ['support', 'customer service', 'customer support', 'help', 'response', 'respond', 'responding', 'replied', 'reply', 'contact', 'email', 'ticket', 'complaint', 'complained', 'resolution', 'resolve', 'resolved', 'unresolved', 'ignored', 'ignore', 'ignores', 'unhelpful', 'rude', 'unprofessional']
    }
];

/**
 * Extract bigrams and trigrams from text
 */
function extractNgrams(text, n) {
    const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const ngrams = [];
    for (let i = 0; i <= words.length - n; i++) {
        ngrams.push(words.slice(i, i + n).join(' '));
    }
    return ngrams;
}

/**
 * Detect problems and patterns across all reviews
 */
export function extractProblems(reviews) {
    const categoryResults = PROBLEM_CATEGORIES.map(cat => ({
        ...cat, matchedReviews: [], matchedKeywords: {}
    }));

    // Match reviews to categories
    reviews.forEach((review, idx) => {
        const lower = review.toLowerCase();
        categoryResults.forEach(cat => {
            const matched = [];
            cat.keywords.forEach(kw => {
                if (lower.includes(kw)) {
                    matched.push(kw);
                    cat.matchedKeywords[kw] = (cat.matchedKeywords[kw] || 0) + 1;
                }
            });
            if (matched.length > 0) {
                cat.matchedReviews.push({ index: idx, text: review, matchedKeywords: matched });
            }
        });
    });

    // Sort categories by frequency
    const sorted = categoryResults
        .filter(c => c.matchedReviews.length > 0)
        .sort((a, b) => b.matchedReviews.length - a.matchedReviews.length);

    // Extract recurring phrases (bigrams/trigrams)
    const bigramFreq = {};
    const trigramFreq = {};
    const stopwords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'this', 'that', 'with', 'they', 'from', 'will', 'would', 'there', 'their', 'what', 'about', 'which', 'when', 'make', 'like', 'just', 'very', 'than', 'them', 'other', 'into', 'some', 'could', 'more', 'its']);

    reviews.forEach(review => {
        const bigrams = extractNgrams(review, 2);
        bigrams.forEach(bg => {
            const parts = bg.split(' ');
            if (!parts.some(p => stopwords.has(p))) {
                bigramFreq[bg] = (bigramFreq[bg] || 0) + 1;
            }
        });
        const trigrams = extractNgrams(review, 3);
        trigrams.forEach(tg => {
            const parts = tg.split(' ');
            if (parts.filter(p => !stopwords.has(p)).length >= 2) {
                trigramFreq[tg] = (trigramFreq[tg] || 0) + 1;
            }
        });
    });

    const topBigrams = Object.entries(bigramFreq)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1]).slice(0, 15)
        .map(([phrase, count]) => ({ phrase, count }));

    const topTrigrams = Object.entries(trigramFreq)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([phrase, count]) => ({ phrase, count }));

    return {
        categories: sorted,
        totalReviews: reviews.length,
        reviewsWithProblems: new Set(sorted.flatMap(c => c.matchedReviews.map(r => r.index))).size,
        recurringPhrases: { bigrams: topBigrams, trigrams: topTrigrams }
    };
}
