import AFINN from '../data/afinn.js';

const NEGATION_WORDS = new Set([
    'not', "don't", "doesn't", "didn't", "won't", "wouldn't", "couldn't",
    "shouldn't", "isn't", "aren't", "wasn't", "weren't", "no", "never",
    "neither", "nor", "hardly", "barely", "scarcely", "nothing"
]);

const INTENSIFIERS = {
    'very': 1.5, 'really': 1.5, 'extremely': 2.0, 'absolutely': 2.0,
    'totally': 1.5, 'completely': 1.5, 'incredibly': 2.0, 'super': 1.8,
    'so': 1.4, 'too': 1.3, 'pretty': 1.2, 'quite': 1.3, 'somewhat': 0.7,
    'slightly': 0.5
};

function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z'\s-]/g, ' ').split(/\s+/).filter(w => w.length > 1);
}

export function analyzeReview(text) {
    const tokens = tokenize(text);
    let score = 0;
    const scoredWords = [];
    let negated = false;
    let intensifier = 1;

    for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i];
        if (NEGATION_WORDS.has(word)) { negated = true; continue; }
        if (INTENSIFIERS[word]) { intensifier = INTENSIFIERS[word]; continue; }
        if (AFINN.hasOwnProperty(word)) {
            let ws = Math.round(AFINN[word] * intensifier * 10) / 10;
            if (negated) { ws = -ws; negated = false; }
            score += ws;
            scoredWords.push({ word, score: ws });
        } else {
            if (negated) negated = false;
        }
        intensifier = 1;
    }

    const comparative = tokens.length > 0 ? score / tokens.length : 0;
    let label = score > 1 ? 'positive' : score < -1 ? 'negative' : 'neutral';
    return { score: Math.round(score * 100) / 100, comparative: Math.round(comparative * 1000) / 1000, label, words: scoredWords };
}

export function getSentimentColor(label) {
    return label === 'positive' ? '#00e676' : label === 'negative' ? '#ff5252' : '#ffd740';
}

export function analyzeAllReviews(reviews) {
    const results = reviews.map((text, i) => ({ index: i, text, ...analyzeReview(text) }));
    const positive = results.filter(r => r.label === 'positive').length;
    const negative = results.filter(r => r.label === 'negative').length;
    const neutral = results.filter(r => r.label === 'neutral').length;
    const totalScore = results.reduce((s, r) => s + r.score, 0);
    const avgScore = results.length > 0 ? totalScore / results.length : 0;
    const sorted = [...results].sort((a, b) => a.score - b.score);

    const wordFreq = {};
    results.forEach(r => r.words.forEach(w => {
        if (!wordFreq[w.word]) wordFreq[w.word] = { count: 0, totalScore: 0 };
        wordFreq[w.word].count++; wordFreq[w.word].totalScore += w.score;
    }));
    const topWords = Object.entries(wordFreq)
        .map(([word, d]) => ({ word, ...d, avgScore: d.totalScore / d.count }))
        .sort((a, b) => b.count - a.count).slice(0, 20);

    return {
        total: results.length, positive, negative, neutral,
        averageScore: Math.round(avgScore * 100) / 100,
        mostPositive: sorted[sorted.length - 1] || null,
        mostNegative: sorted[0] || null,
        topWords, results
    };
}
