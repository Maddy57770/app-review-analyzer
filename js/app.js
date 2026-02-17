import { analyzeAllReviews, getSentimentColor } from './sentiment.js';
import { extractProblems } from './problems.js';
import { renderSentimentChart, renderProblemsChart, renderDistributionChart } from './charts.js';

// ─── Sample Reviews ───────────────────────────────────
const SAMPLE_REVIEWS_PLAYSTORE = [
    "This app crashes every time I try to open my profile. Very frustrating experience!",
    "Amazing app! Love the clean interface and smooth performance. Highly recommend it.",
    "Too many ads! Every 30 seconds there's a popup. It's basically unusable now.",
    "The latest update completely ruined the app. It was fine before, now it keeps freezing.",
    "Great customer support team. They resolved my issue within hours. Thank you!",
    "Battery drain is insane. This app eats up 40% of my battery in an hour.",
    "Privacy concerns - this app seems to track everything and asks for unnecessary permissions.",
    "The app is okay but really needs a dark mode. Also the font size is too small.",
    "I can't even log in anymore. Password reset doesn't work. Terrible experience.",
    "Best app in its category! Fast, reliable, and the features are incredible.",
    "Notifications are out of control. I get 20+ notifications a day even after turning them off.",
    "Very slow loading times. Sometimes takes 30 seconds just to open the main page.",
    "Love this app! It has everything I need. The new update made it even better.",
    "Constant disconnections. The app loses connection every few minutes. Fix your servers!",
    "The UI is very confusing. Took me forever to find basic settings. Needs a redesign.",
    "Scam alert! They charged me twice for the subscription and support won't respond.",
    "Decent app but missing some important features that competitors already have.",
    "After the update, my saved data was completely deleted. Absolutely unacceptable!",
    "Smooth, intuitive, and beautifully designed. One of the best apps I've ever used.",
    "The app works fine on WiFi but is completely broken on mobile data. Very annoying.",
    "Keeps crashing on my phone after the last update. Please fix this ASAP!",
    "I've been using this for 2 years and it just keeps getting better. 5 stars!",
    "Horrible customer service. Been waiting 3 weeks for a response to my ticket.",
    "The app is bloated with unnecessary features. It used to be simple and clean.",
    "Can't believe they removed the free version. Now everything requires a subscription."
];

const SAMPLE_REVIEWS_APPSTORE = [
    "App freezes constantly since iOS 17 update. Developers need to fix compatibility issues ASAP.",
    "Absolutely love this app! It's elegant, fast, and completely worth the price.",
    "Drains my iPhone battery like crazy. Had to uninstall after a day of use.",
    "The subscription model is ridiculous. $14.99/month for basic features? No thanks.",
    "Wonderful experience overall. Clean design and intuitive navigation. 5 stars!",
    "App crashes when I try to upload photos. This bug has been there for months!",
    "Push notifications don't work half the time. Missed important alerts because of this.",
    "Security concern: the app asks for camera and microphone access even when not needed.",
    "After the latest update, all my settings were reset. Very frustrating!",
    "Best app for productivity! Syncs perfectly across all my Apple devices.",
    "Login issues every single day. Have to reset my password constantly.",
    "The dark mode looks gorgeous! Finally an app that does dark mode right.",
    "Way too many in-app purchases. The free version is basically a demo.",
    "Extremely slow on my iPad Air. Takes forever to load content.",
    "Customer support actually responded and fixed my issue same day. Rare these days!",
    "The app keeps sending me spam notifications. There's no way to fully disable them.",
    "Beautifully designed but lacks basic features. Form over function.",
    "Network errors every time I'm on cellular data. Only works on WiFi.",
    "This used to be my favorite app but the new update made it worse. Bringing back old bugs.",
    "Simple, effective, and doesn't try to do too much. Perfect utility app."
];

// ─── State ─────────────────────────────────────────────
const REVIEW_DELIMITER = '\n─────\n';
let currentTab = 'problems';
let analysisData = null;

// ─── DOM Elements ──────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    $$('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // Platform picker
    $$('.platform-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.platform-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Analyze button
    $('#analyze-btn').addEventListener('click', runAnalysis);

    // Sample data button
    $('#sample-btn').addEventListener('click', loadSampleData);

    // Fetch from URL button
    $('#fetch-btn').addEventListener('click', fetchFromUrl);

    // Allow Enter key in URL input
    $('#url-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') fetchFromUrl();
    });

    // Clear button
    $('#clear-btn').addEventListener('click', () => {
        $('#review-input').value = '';
        $('#url-input').value = '';
        $('#results-section').classList.add('hidden');
        $('#empty-state').classList.remove('hidden');
        updateReviewCount();
    });

    // Textarea counter
    const textarea = $('#review-input');
    textarea.addEventListener('input', () => {
        updateReviewCount();
    });
});

function getActivePlatform() {
    return $('.platform-btn.active')?.dataset.platform || 'playstore';
}

function loadSampleData() {
    const platform = getActivePlatform();
    const samples = platform === 'appstore' ? SAMPLE_REVIEWS_APPSTORE : SAMPLE_REVIEWS_PLAYSTORE;
    $('#review-input').value = samples.join(REVIEW_DELIMITER);
    updateReviewCount();
}

// ─── Fetch from URL ────────────────────────────────────
async function fetchFromUrl() {
    const url = $('#url-input').value.trim();
    if (!url) {
        showToast('Please paste a Play Store or App Store URL.', 'warning');
        return;
    }

    if (!url.includes('play.google.com') && !url.includes('apps.apple.com') && !url.includes('itunes.apple.com')) {
        showToast('Invalid URL. Please use a Google Play Store or Apple App Store link.', 'warning');
        return;
    }

    // Show loading
    const fetchBtn = $('#fetch-btn');
    fetchBtn.classList.add('loading');
    fetchBtn.innerHTML = '<span class="spinner"></span> Fetching...';
    $('#url-hint').textContent = 'Connecting to store and fetching reviews...';
    $('#url-hint').classList.add('fetching');

    try {
        const response = await fetch(`/api/reviews?url=${encodeURIComponent(url)}`);
        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || 'Failed to fetch reviews.', 'error');
            $('#url-hint').textContent = data.error || 'Error fetching reviews.';
            $('#url-hint').classList.add('error');
            return;
        }

        // Auto-select the platform
        const platformBtn = data.platform === 'appstore' ? '#btn-appstore' : '#btn-playstore';
        $$('.platform-btn').forEach(b => b.classList.remove('active'));
        $(platformBtn).classList.add('active');

        // Populate textarea
        const reviewTexts = data.reviews.map(r => r.text);
        $('#review-input').value = reviewTexts.join(REVIEW_DELIMITER);
        updateReviewCount();

        showToast(`Fetched ${data.count} reviews from ${data.platform === 'appstore' ? 'App Store' : 'Play Store'}!`, 'success');
        $('#url-hint').textContent = `✅ Fetched ${data.count} reviews. Click "Analyze Reviews" to see insights.`;
        $('#url-hint').classList.remove('error');
        $('#url-hint').classList.add('success');

    } catch (err) {
        console.error('Fetch error:', err);
        showToast('Network error. Make sure the server is running.', 'error');
        $('#url-hint').textContent = '❌ Connection failed. Is the server running?';
        $('#url-hint').classList.add('error');
    } finally {
        fetchBtn.classList.remove('loading');
        fetchBtn.innerHTML = '<span class="btn-icon">📥</span> Fetch Reviews';
        setTimeout(() => {
            $('#url-hint').classList.remove('fetching', 'success', 'error');
            $('#url-hint').textContent = 'Example: https://play.google.com/store/apps/details?id=com.example.app';
        }, 8000);
    }
}

function updateReviewCount() {
    const text = $('#review-input').value.trim();
    const count = text ? text.split('─────').filter(l => l.trim()).length : 0;
    $('#review-count').textContent = `${count} review${count !== 1 ? 's' : ''} detected`;
}

function switchTab(tab) {
    currentTab = tab;
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
}

// ─── Main Analysis ─────────────────────────────────────
function runAnalysis() {
    const text = $('#review-input').value.trim();
    if (!text) {
        showToast('Please enter some reviews to analyze!', 'warning');
        return;
    }

    const reviews = text.split('─────').filter(l => l.trim()).map(l => l.trim());
    if (reviews.length < 2) {
        showToast('Please enter at least 2 reviews for meaningful analysis.', 'warning');
        return;
    }

    // Show loading
    $('#analyze-btn').classList.add('loading');
    $('#analyze-btn').innerHTML = '<span class="spinner"></span> Analyzing...';

    setTimeout(() => {
        try {
            const sentimentData = analyzeAllReviews(reviews);
            const problemsData = extractProblems(reviews);
            analysisData = { sentiment: sentimentData, problems: problemsData };

            renderResults();
            $('#results-section').classList.remove('hidden');
            $('#empty-state').classList.add('hidden');

            // Smooth scroll to results
            $('#results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
            showToast(`Successfully analyzed ${reviews.length} reviews!`, 'success');
        } catch (err) {
            console.error(err);
            showToast('An error occurred during analysis. Please try again.', 'error');
        } finally {
            $('#analyze-btn').classList.remove('loading');
            $('#analyze-btn').innerHTML = '<span class="btn-icon">🔍</span> Analyze Reviews';
        }
    }, 600);
}

// ─── Render Results ────────────────────────────────────
function renderResults() {
    renderOverviewStats();
    renderProblemsPanel();
    renderSentimentPanel();
}

function renderOverviewStats() {
    const s = analysisData.sentiment;
    const p = analysisData.problems;

    $('#stat-total').textContent = s.total;
    $('#stat-positive').textContent = s.positive;
    $('#stat-negative').textContent = s.negative;
    $('#stat-problems').textContent = p.reviewsWithProblems;

    // Animate counters
    $$('.stat-value').forEach(el => {
        el.classList.add('animate');
        setTimeout(() => el.classList.remove('animate'), 600);
    });
}

function renderProblemsPanel() {
    const { categories, recurringPhrases } = analysisData.problems;

    // Problem categories
    const container = $('#problems-list');
    if (categories.length === 0) {
        container.innerHTML = `<div class="empty-card"><p>No specific problems detected in the reviews.</p></div>`;
        return;
    }

    container.innerHTML = categories.map(cat => `
    <div class="problem-card">
      <div class="problem-header">
        <span class="problem-icon">${cat.icon}</span>
        <div class="problem-info">
          <h3 class="problem-name">${cat.name}</h3>
          <span class="problem-count">${cat.matchedReviews.length} mention${cat.matchedReviews.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="problem-badge">${Math.round((cat.matchedReviews.length / analysisData.sentiment.total) * 100)}%</div>
      </div>
      <div class="problem-keywords">
        ${Object.entries(cat.matchedKeywords).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([kw, count]) =>
        `<span class="keyword-tag">${kw} <small>(${count})</small></span>`
    ).join('')}
      </div>
      <div class="problem-samples">
        ${cat.matchedReviews.slice(0, 3).map(r =>
        `<div class="sample-review"><span class="quote-mark">"</span>${truncate(r.text, 140)}</div>`
    ).join('')}
      </div>
    </div>
  `).join('');

    // Recurring phrases
    const phrasesContainer = $('#recurring-phrases');
    const allPhrases = [...recurringPhrases.trigrams, ...recurringPhrases.bigrams].slice(0, 12);
    if (allPhrases.length > 0) {
        phrasesContainer.innerHTML = `
      <h3 class="section-subtitle">🔁 Recurring Phrases</h3>
      <div class="phrases-cloud">
        ${allPhrases.map(p => {
            const size = Math.min(1.4, 0.85 + (p.count * 0.1));
            return `<span class="phrase-tag" style="font-size:${size}rem">${p.phrase} <small>×${p.count}</small></span>`;
        }).join('')}
      </div>
    `;
    } else {
        phrasesContainer.innerHTML = '';
    }

    // Problems chart
    renderProblemsChart('problems-chart', categories);
}

function renderSentimentPanel() {
    const data = analysisData.sentiment;

    // Sentiment chart
    renderSentimentChart('sentiment-chart', data);

    // Distribution chart
    renderDistributionChart('distribution-chart', data.results);

    // Average score display
    const avgEl = $('#avg-score');
    const scoreLabel = data.averageScore > 1 ? 'Positive' : data.averageScore < -1 ? 'Negative' : 'Neutral';
    const scoreColor = data.averageScore > 1 ? '#00e676' : data.averageScore < -1 ? '#ff5252' : '#ffd740';
    avgEl.innerHTML = `<span style="color:${scoreColor}">${data.averageScore > 0 ? '+' : ''}${data.averageScore}</span> <small>(${scoreLabel})</small>`;

    // Top sentiment words
    const wordsContainer = $('#top-words');
    wordsContainer.innerHTML = data.topWords.slice(0, 12).map(w => {
        const color = w.avgScore > 0 ? '#00e676' : w.avgScore < 0 ? '#ff5252' : '#ffd740';
        return `<span class="word-chip" style="border-color:${color}40;color:${color}">${w.word} <small>(${w.count})</small></span>`;
    }).join('');

    // Review table
    const tbody = $('#review-table-body');
    const sortedResults = [...data.results].sort((a, b) => a.score - b.score);
    tbody.innerHTML = sortedResults.map(r => {
        const color = getSentimentColor(r.label);
        return `
      <tr>
        <td><span class="sentiment-dot" style="background:${color}"></span><span class="sentiment-label" style="color:${color}">${capitalize(r.label)}</span></td>
        <td class="score-cell" style="color:${color}">${r.score > 0 ? '+' : ''}${r.score}</td>
        <td class="review-text-cell">${truncate(r.text, 120)}</td>
      </tr>
    `;
    }).join('');
}

// ─── Utility ───────────────────────────────────────────
function truncate(str, len) {
    return str.length > len ? str.slice(0, len) + '…' : str;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showToast(message, type = 'info') {
    const existing = $('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
