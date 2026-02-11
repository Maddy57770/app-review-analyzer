import { getSentimentColor } from './sentiment.js';

let sentimentChartInstance = null;
let problemsChartInstance = null;
let distributionChartInstance = null;

/**
 * Render the sentiment doughnut chart
 */
export function renderSentimentChart(canvasId, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (sentimentChartInstance) sentimentChartInstance.destroy();

    sentimentChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [data.positive, data.neutral, data.negative],
                backgroundColor: ['#00e676', '#ffd740', '#ff5252'],
                borderColor: 'rgba(15, 15, 30, 0.8)',
                borderWidth: 3,
                hoverOffset: 12,
                spacing: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#c0c6d0', font: { family: 'Inter', size: 13 }, padding: 20, usePointStyle: true, pointStyleWidth: 12 }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 15, 30, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#c0c6d0',
                    borderColor: 'rgba(124,77,255,0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    titleFont: { family: 'Inter', weight: 600 },
                    bodyFont: { family: 'Inter' },
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.raw / total) * 100).toFixed(1);
                            return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render problem frequency horizontal bar chart
 */
export function renderProblemsChart(canvasId, categories) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (problemsChartInstance) problemsChartInstance.destroy();

    const top8 = categories.slice(0, 8);
    const labels = top8.map(c => `${c.icon} ${c.name}`);
    const values = top8.map(c => c.matchedReviews.length);

    const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
    gradient.addColorStop(0, 'rgba(124,77,255,0.8)');
    gradient.addColorStop(1, 'rgba(0,230,118,0.6)');

    problemsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Mentions',
                data: values,
                backgroundColor: gradient,
                borderColor: 'rgba(124,77,255,0.4)',
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
                barPercentage: 0.7
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 15, 30, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#c0c6d0',
                    borderColor: 'rgba(124,77,255,0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    titleFont: { family: 'Inter' },
                    bodyFont: { family: 'Inter' }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                    ticks: { color: '#8890a0', font: { family: 'Inter', size: 12 } }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#c0c6d0', font: { family: 'Inter', size: 12 } }
                }
            }
        }
    });
}

/**
 * Render sentiment score distribution histogram
 */
export function renderDistributionChart(canvasId, results) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (distributionChartInstance) distributionChartInstance.destroy();

    // Bucket scores
    const buckets = {};
    const ranges = ['< -6', '-6 to -4', '-4 to -2', '-2 to 0', '0 to 2', '2 to 4', '4 to 6', '> 6'];
    ranges.forEach(r => buckets[r] = 0);

    results.forEach(r => {
        const s = r.score;
        if (s < -6) buckets['< -6']++;
        else if (s < -4) buckets['-6 to -4']++;
        else if (s < -2) buckets['-4 to -2']++;
        else if (s < 0) buckets['-2 to 0']++;
        else if (s < 2) buckets['0 to 2']++;
        else if (s < 4) buckets['2 to 4']++;
        else if (s < 6) buckets['4 to 6']++;
        else buckets['> 6']++;
    });

    const colors = ['#ff1744', '#ff5252', '#ff8a80', '#ffd740', '#b2ff59', '#69f0ae', '#00e676', '#00c853'];

    distributionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ranges,
            datasets: [{
                label: 'Reviews',
                data: Object.values(buckets),
                backgroundColor: colors.map(c => c + 'cc'),
                borderColor: colors,
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 15, 30, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#c0c6d0',
                    borderColor: 'rgba(124,77,255,0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#8890a0', font: { family: 'Inter', size: 11 } },
                    title: { display: true, text: 'Sentiment Score Range', color: '#8890a0', font: { family: 'Inter', size: 12 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#8890a0', font: { family: 'Inter', size: 12 } },
                    title: { display: true, text: 'Number of Reviews', color: '#8890a0', font: { family: 'Inter', size: 12 } }
                }
            }
        }
    });
}
