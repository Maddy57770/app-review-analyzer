const express = require('express');
const path = require('path');
const gplay = require('google-play-scraper');

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files
app.use(express.static(path.join(__dirname)));

// ─── Parse App ID from URL ─────────────────────────────
function parsePlayStoreId(url) {
    // Handles: https://play.google.com/store/apps/details?id=com.example.app
    const match = url.match(/[?&]id=([a-zA-Z0-9._]+)/);
    return match ? match[1] : null;
}

function parseAppStoreId(url) {
    // Handles: https://apps.apple.com/us/app/appname/id123456789
    const match = url.match(/\/id(\d+)/);
    return match ? match[1] : null;
}

function detectPlatform(url) {
    if (url.includes('play.google.com')) return 'playstore';
    if (url.includes('apps.apple.com') || url.includes('itunes.apple.com')) return 'appstore';
    return null;
}

// ─── Sort Mapping ──────────────────────────────────────
const SORT_MAP = {
    newest: gplay.sort.NEWEST,
    rating: gplay.sort.RATING,
    helpfulness: gplay.sort.HELPFULNESS
};

// ─── API: Fetch Reviews ────────────────────────────────
app.get('/api/reviews', async (req, res) => {
    const { url, sort = 'newest', num = '150', page = '1', score = '' } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    const platform = detectPlatform(url);
    if (!platform) {
        return res.status(400).json({ error: 'Invalid URL. Please provide a Google Play Store or Apple App Store link.' });
    }

    const reviewCount = Math.min(Math.max(parseInt(num) || 150, 10), 500);
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const sortKey = SORT_MAP[sort] ? sort : 'newest';
    const scoreFilter = parseInt(score) || 0; // 0 = all ratings

    try {
        let reviews = [];
        let hasMore = false;
        let nextPage = null;

        if (platform === 'playstore') {
            const appId = parsePlayStoreId(url);
            if (!appId) {
                return res.status(400).json({ error: 'Could not extract app ID from Play Store URL.' });
            }

            console.log(`Fetching Play Store reviews for: ${appId} (sort=${sortKey}, num=${reviewCount}, page=${pageNum}, score=${scoreFilter})`);

            // Each paginated batch returns ~150 reviews
            // Calculate batches needed per "page" to fill the requested count
            const BATCH_SIZE = 150;
            const batchesPerPage = Math.ceil(reviewCount / BATCH_SIZE);
            const batchesToSkip = (pageNum - 1) * batchesPerPage;

            let paginationToken = undefined;

            // Skip batches for previous pages
            for (let i = 0; i < batchesToSkip; i++) {
                const skipResult = await gplay.reviews({
                    appId,
                    sort: SORT_MAP[sortKey],
                    lang: 'en',
                    country: 'us',
                    paginate: true,
                    nextPaginationToken: paginationToken
                });
                paginationToken = skipResult.nextPaginationToken;
                if (!paginationToken) break;
            }

            // Fetch enough batches to fill the requested count
            const allReviews = [];
            for (let i = 0; i < batchesPerPage && allReviews.length < reviewCount; i++) {
                const result = await gplay.reviews({
                    appId,
                    sort: SORT_MAP[sortKey],
                    lang: 'en',
                    country: 'us',
                    paginate: true,
                    nextPaginationToken: paginationToken
                });

                for (const r of result.data) {
                    if (allReviews.length >= reviewCount) break;
                    allReviews.push({
                        text: r.text ? r.text.replace(/[\r\n]+/g, ' ').trim() : '',
                        score: r.score,
                        author: r.userName,
                        date: r.date
                    });
                }

                paginationToken = result.nextPaginationToken;
                if (!paginationToken) break;
            }

            reviews = allReviews;
            hasMore = !!paginationToken;
            if (hasMore) nextPage = pageNum + 1;

        } else if (platform === 'appstore') {
            const appId = parseAppStoreId(url);
            if (!appId) {
                return res.status(400).json({ error: 'Could not extract app ID from App Store URL.' });
            }

            // Map sort param to RSS feed sort
            const rssSortBy = (sortKey === 'helpfulness') ? 'mosthelpful' : 'mostrecent';

            // Calculate how many RSS pages we need (each RSS page has ~50 reviews)
            const pagesNeeded = Math.ceil(reviewCount / 50);
            const startPage = ((pageNum - 1) * pagesNeeded) + 1;
            const endPage = Math.min(startPage + pagesNeeded - 1, 10);

            console.log(`Fetching App Store reviews for ID: ${appId} (sort=${rssSortBy}, pages ${startPage}-${endPage}, page=${pageNum}, score=${scoreFilter})`);

            if (startPage > 10) {
                return res.json({ platform, count: 0, reviews: [], hasMore: false, nextPage: null });
            }

            const allReviews = [];
            for (let p = startPage; p <= endPage; p++) {
                try {
                    const feedUrl = `https://itunes.apple.com/us/rss/customerreviews/page=${p}/id=${appId}/sortby=${rssSortBy}/json`;
                    const response = await fetch(feedUrl);
                    if (!response.ok) break;

                    const data = await response.json();
                    const entries = data?.feed?.entry;
                    if (!entries || !Array.isArray(entries)) break;

                    for (const entry of entries) {
                        const content = entry?.content?.label;
                        const title = entry?.title?.label;
                        const rating = entry?.['im:rating']?.label;
                        const author = entry?.author?.name?.label;
                        if (content && title !== 'iTunes Store') {
                            const rawText = title ? `${title} - ${content}` : content;
                            allReviews.push({
                                text: rawText.replace(/[\r\n]+/g, ' ').trim(),
                                score: rating ? parseInt(rating) : null,
                                author: author || 'Anonymous',
                                date: null
                            });
                        }
                    }
                } catch (e) {
                    break;
                }
            }
            reviews = allReviews;

            // Check if there are more pages available
            const nextStartPage = endPage + 1;
            if (nextStartPage <= 10) {
                hasMore = true;
                nextPage = pageNum + 1;
            }
        }

        // Check if we got any reviews from the store
        if (reviews.length === 0) {
            return res.status(404).json({ error: 'No reviews found for this app. The app may have no reviews, or the URL might be incorrect.' });
        }

        console.log(`Fetched ${reviews.length} reviews successfully.`);
        res.json({ platform, count: reviews.length, reviews, hasMore, nextPage });

    } catch (err) {
        console.error('Error fetching reviews:', err.message);
        res.status(500).json({ error: 'Failed to fetch reviews. Please check the URL and try again.' });
    }
});

// ─── Start Server ──────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n  🚀 App Review Analyzer running at http://localhost:${PORT}\n`);
});
