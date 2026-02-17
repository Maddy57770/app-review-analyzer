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

// ─── API: Fetch Reviews ────────────────────────────────
app.get('/api/reviews', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    const platform = detectPlatform(url);
    if (!platform) {
        return res.status(400).json({ error: 'Invalid URL. Please provide a Google Play Store or Apple App Store link.' });
    }

    try {
        let reviews = [];

        if (platform === 'playstore') {
            const appId = parsePlayStoreId(url);
            if (!appId) {
                return res.status(400).json({ error: 'Could not extract app ID from Play Store URL.' });
            }

            console.log(`Fetching Play Store reviews for: ${appId}`);
            const result = await gplay.reviews({
                appId: appId,
                sort: gplay.sort.NEWEST,
                num: 150,
                lang: 'en',
                country: 'us'
            });

            reviews = result.data.map(r => ({
                text: r.text ? r.text.replace(/[\r\n]+/g, ' ').trim() : '',
                score: r.score,
                author: r.userName,
                date: r.date
            }));

        } else if (platform === 'appstore') {
            const appId = parseAppStoreId(url);
            if (!appId) {
                return res.status(400).json({ error: 'Could not extract app ID from App Store URL.' });
            }

            console.log(`Fetching App Store reviews for ID: ${appId}`);

            // Fetch multiple pages from iTunes RSS feed
            const allReviews = [];
            for (let page = 1; page <= 5; page++) {
                try {
                    const feedUrl = `https://itunes.apple.com/us/rss/customerreviews/page=${page}/id=${appId}/sortby=mostrecent/json`;
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
        }

        if (reviews.length === 0) {
            return res.status(404).json({ error: 'No reviews found for this app. The app may have no reviews, or the URL might be incorrect.' });
        }

        console.log(`Fetched ${reviews.length} reviews successfully.`);
        res.json({ platform, count: reviews.length, reviews });

    } catch (err) {
        console.error('Error fetching reviews:', err.message);
        res.status(500).json({ error: 'Failed to fetch reviews. Please check the URL and try again.' });
    }
});

// ─── Start Server ──────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n  🚀 App Review Analyzer running at http://localhost:${PORT}\n`);
});
