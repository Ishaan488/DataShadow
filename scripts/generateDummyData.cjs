/**
 * DataShadow — Dummy Data Generator
 * 
 * Generates realistic export files that mimic the actual formats from:
 * - Google Takeout (MyActivity.json, watch-history.json, Records.json)
 * - Chrome Browser History (BrowserHistory.json)
 * - Email Metadata (emails.json)
 * - Social Media (posts.json)
 * 
 * Usage: node scripts/generateDummyData.cjs
 * Output: scripts/dummy-exports/
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'dummy-exports');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Helpers ───────────────────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const BASE = Date.now() - 120 * DAY; // 120 days ago

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function isoDate(ts) {
    return new Date(ts).toISOString();
}

// ─── Persona: "Alex Rivera" ────────────────────────────────
const PERSONA = {
    name: 'Alex Rivera',
    email: 'alex.rivera.dev@gmail.com',
    home: { lat: 37.7749, lng: -122.4194, name: 'Maple Street Apartments', address: '1234 Maple St, Apt 7C, San Francisco, CA 94102' },
    work: { lat: 37.7897, lng: -122.3972, name: 'TechCorp HQ', address: '500 Innovation Blvd, San Francisco, CA 94105' },
    gym: { lat: 37.7694, lng: -122.4283, name: 'Planet Fitness - Castro', address: '321 Market St, San Francisco, CA 94114' },
    bank: { lat: 37.7901, lng: -122.4013, name: 'Chase Bank - Financial District', address: '555 Montgomery St, San Francisco, CA 94111' },
    cafe: { lat: 37.7855, lng: -122.4090, name: 'Blue Bottle Coffee - Mint Plaza', address: '66 Mint St, San Francisco, CA 94103' },
    doctor: { lat: 37.7631, lng: -122.4576, name: 'UCSF Medical Center', address: '505 Parnassus Ave, San Francisco, CA 94143' },
};

const CONTACTS = [
    { name: 'Mike Chen', email: 'mike.chen@techcorp.io', relation: 'coworker' },
    { name: 'Sarah Johnson', email: 'sarah.johnson@techcorp.io', relation: 'manager' },
    { name: 'Priya Patel', email: 'priya.patel@gmail.com', relation: 'friend' },
    { name: 'David Kim', email: 'david.kim@stanford.edu', relation: 'friend' },
    { name: 'Emma Wilson', email: 'emma.w@protonmail.com', relation: 'partner' },
    { name: 'Carlos Mendez', email: 'carlos.mendez@techcorp.io', relation: 'coworker' },
    { name: 'Dr. Lisa Huang', email: 'lhuang@ucsf.edu', relation: 'doctor' },
];

// ═══════════════════════════════════════════════════════════
// 1. Google Search — MyActivity.json
// ═══════════════════════════════════════════════════════════
function generateGoogleSearch() {
    const queries = [
        // Financial
        'Chase Bank login', 'best savings account interest rates 2025', 'Coinbase withdrawal limits',
        'how to file taxes online', 'Roth IRA contribution limits 2025', 'credit score check free',
        'Bitcoin price today', 'stock portfolio rebalancing strategy', 'W-2 form deadline 2025',
        'credit card travel rewards comparison',
        // Health
        'symptoms of vitamin D deficiency', 'best multivitamins for men', 'UCSF urgent care wait times',
        'how much sleep do you need', 'lower back pain stretches', 'flu shot near me 2025',
        // Shopping
        'Amazon Prime Day 2025 deals', 'best noise cancelling headphones 2025', 'MacBook Pro M4 review',
        'standing desk converter Amazon', 'best running shoes for flat feet',
        // Travel
        'flights SFO to JFK December', 'Airbnb Tokyo Shibuya', 'TSA PreCheck application',
        'best restaurants in Manhattan', 'Japan Rail Pass worth it',
        // Work / Tech
        'React 19 new features', 'TypeScript generics tutorial', 'how to use Vite with React',
        'system design interview questions', 'PostgreSQL performance tuning', 'gRPC vs REST comparison',
        // Personal
        'Sarah Johnson LinkedIn', 'Mike Chen GitHub', 'Stanford University MS CS admissions',
        'best engagement rings San Francisco', 'couples cooking class SF',
        'how to negotiate salary tech industry', 'imposter syndrome developer',
        // Location-revealing
        'restaurants near Financial District SF', 'parking near 500 Innovation Blvd',
        'Planet Fitness Castro hours', 'Maple Street Apartments reviews SF',
        'BART schedule Embarcadero', 'Golden Gate Park running trail',
    ];

    const items = [];
    for (let day = 0; day < 90; day++) {
        const searchCount = randomBetween(2, 8);
        for (let s = 0; s < searchCount; s++) {
            const ts = BASE + day * DAY + randomBetween(7, 23) * HOUR + randomBetween(0, 59) * 60000;
            const query = pick(queries);
            items.push({
                header: 'Search',
                title: `Searched for ${query}`,
                titleUrl: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                time: isoDate(ts),
                products: ['Search'],
            });
        }
    }
    return items;
}

// ═══════════════════════════════════════════════════════════
// 2. YouTube Watch History — watch-history.json
// ═══════════════════════════════════════════════════════════
function generateYouTubeHistory() {
    const videos = [
        { title: 'How Hackers Steal Your Data — 2025 Documentary', channel: 'CyberSec Academy', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        { title: 'Complete React 19 Tutorial for Beginners', channel: 'Fireship', url: 'https://www.youtube.com/watch?v=abc123' },
        { title: 'Investing 101 — Stock Market for Beginners', channel: 'Graham Stephan', url: 'https://www.youtube.com/watch?v=def456' },
        { title: 'Day in the Life of a Software Engineer in San Francisco', channel: 'TechLead', url: 'https://www.youtube.com/watch?v=ghi789' },
        { title: 'Tokyo Travel Guide 2025 — Everything You Need to Know', channel: 'Abroad in Japan', url: 'https://www.youtube.com/watch?v=jkl012' },
        { title: 'Python Machine Learning — Full Course', channel: 'sentdex', url: 'https://www.youtube.com/watch?v=mno345' },
        { title: 'Home Network Security — Complete Setup Guide', channel: 'NetworkChuck', url: 'https://www.youtube.com/watch?v=pqr678' },
        { title: 'Bitcoin Analysis — Is it Time to Buy?', channel: 'Coin Bureau', url: 'https://www.youtube.com/watch?v=stu901' },
        { title: 'How to Negotiate Your Salary — Tech Edition', channel: 'Rahul Pandey', url: 'https://www.youtube.com/watch?v=vwx234' },
        { title: 'System Design Interview — Step by Step Guide', channel: 'Alex Xu', url: 'https://www.youtube.com/watch?v=yza567' },
        { title: 'Best Running Routes in San Francisco', channel: 'SF Running Club', url: 'https://www.youtube.com/watch?v=run001' },
        { title: 'Meal Prep for the Week — Healthy Recipes', channel: 'Joshua Weissman', url: 'https://www.youtube.com/watch?v=cook01' },
        { title: 'The Hidden Cost of Free Apps — Privacy Documentary', channel: 'Vox', url: 'https://www.youtube.com/watch?v=priv01' },
        { title: 'TypeScript Advanced Types — Mapped, Conditional, Template Literals', channel: 'Matt Pocock', url: 'https://www.youtube.com/watch?v=ts001' },
        { title: 'How Credit Scores Actually Work', channel: 'Two Cents', url: 'https://www.youtube.com/watch?v=credit01' },
    ];

    const items = [];
    for (let day = 0; day < 90; day++) {
        const watchCount = randomBetween(0, 4);
        for (let w = 0; w < watchCount; w++) {
            const ts = BASE + day * DAY + randomBetween(18, 23) * HOUR + randomBetween(0, 59) * 60000;
            const vid = pick(videos);
            items.push({
                header: 'YouTube',
                title: `Watched ${vid.title}`,
                titleUrl: vid.url,
                time: isoDate(ts),
                products: ['YouTube'],
                subtitles: [{ name: vid.channel, url: `https://www.youtube.com/channel/${vid.channel.replace(/\s/g, '')}` }],
                details: [{ name: 'From Google Ads' }],
                activityControls: ['YouTube watch history'],
            });
        }
    }
    return items;
}

// ═══════════════════════════════════════════════════════════
// 3. Location History — Records.json (new Google format)
// ═══════════════════════════════════════════════════════════
function generateLocationHistory() {
    const places = [
        { ...PERSONA.home, freq: 'daily_morning_night' },
        { ...PERSONA.work, freq: 'weekday_daytime' },
        { ...PERSONA.gym, freq: 'mwf_evening' },
        { ...PERSONA.cafe, freq: 'weekday_morning' },
        { ...PERSONA.bank, freq: 'monthly' },
        { ...PERSONA.doctor, freq: 'quarterly' },
        { lat: 37.8199, lng: -122.4783, name: 'Golden Gate Bridge', address: 'Golden Gate Bridge, San Francisco, CA' },
        { lat: 37.7694, lng: -122.4862, name: 'Ocean Beach', address: 'Ocean Beach, San Francisco, CA' },
        { lat: 37.8024, lng: -122.4058, name: 'Ferry Building Marketplace', address: '1 Ferry Building, San Francisco, CA 94111' },
    ];

    const locations = [];
    for (let day = 0; day < 90; day++) {
        const date = new Date(BASE + day * DAY);
        const isWeekday = date.getDay() >= 1 && date.getDay() <= 5;

        // Home — morning
        locations.push(makeLocationRecord(PERSONA.home, BASE + day * DAY + 7 * HOUR, 30));
        
        // Cafe — weekday morning
        if (isWeekday && Math.random() > 0.4) {
            locations.push(makeLocationRecord(PERSONA.cafe, BASE + day * DAY + 8 * HOUR, 50));
        }

        // Work — weekdays
        if (isWeekday) {
            locations.push(makeLocationRecord(PERSONA.work, BASE + day * DAY + 9 * HOUR, 20));
            locations.push(makeLocationRecord(PERSONA.work, BASE + day * DAY + 12 * HOUR, 20));
            locations.push(makeLocationRecord(PERSONA.work, BASE + day * DAY + 15 * HOUR, 20));
        }

        // Gym — MWF evenings
        if ([1, 3, 5].includes(date.getDay()) && Math.random() > 0.3) {
            locations.push(makeLocationRecord(PERSONA.gym, BASE + day * DAY + 18 * HOUR, 40));
        }

        // Weekend adventures
        if (!isWeekday && Math.random() > 0.5) {
            const adventure = pick([places[6], places[7], places[8]]);
            locations.push(makeLocationRecord(adventure, BASE + day * DAY + 11 * HOUR, 100));
        }

        // Bank — ~monthly
        if (day % 30 === 0) {
            locations.push(makeLocationRecord(PERSONA.bank, BASE + day * DAY + 10 * HOUR, 30));
        }

        // Doctor — ~quarterly
        if (day === 45) {
            locations.push(makeLocationRecord(PERSONA.doctor, BASE + day * DAY + 14 * HOUR, 20));
        }

        // Home — evening
        locations.push(makeLocationRecord(PERSONA.home, BASE + day * DAY + 21 * HOUR, 30));
    }

    return { locations };
}

function makeLocationRecord(place, ts, accuracy) {
    const jitterLat = (Math.random() - 0.5) * 0.001;
    const jitterLng = (Math.random() - 0.5) * 0.001;
    return {
        latitudeE7: Math.round((place.lat + jitterLat) * 1e7),
        longitudeE7: Math.round((place.lng + jitterLng) * 1e7),
        accuracy: accuracy,
        source: 'WIFI',
        deviceTag: 1234567890,
        timestamp: isoDate(ts),
        // old format also uses timestampMs
        timestampMs: String(ts),
    };
}

// ═══════════════════════════════════════════════════════════
// 4. Browser History — BrowserHistory.json (Chrome-like)
// ═══════════════════════════════════════════════════════════
function generateBrowserHistory() {
    const sites = [
        // Financial
        { url: 'https://secure.chase.com/web/auth/dashboard', title: 'Chase | Account Dashboard' },
        { url: 'https://www.coinbase.com/portfolio', title: 'Coinbase — Portfolio' },
        { url: 'https://www.fidelity.com/401k/overview', title: 'Fidelity — 401(k) Balance' },
        { url: 'https://www.irs.gov/filing/free-file', title: 'IRS Free File' },
        { url: 'https://www.creditkarma.com/dashboard', title: 'Credit Karma — Your Credit Score' },
        // Social
        { url: 'https://www.linkedin.com/in/mike-chen-techcorp/', title: 'Mike Chen — Software Engineer at TechCorp | LinkedIn' },
        { url: 'https://twitter.com/home', title: 'Home / X' },
        { url: 'https://www.reddit.com/r/reactjs/', title: 'r/reactjs' },
        { url: 'https://www.instagram.com/', title: 'Instagram' },
        // Shopping
        { url: 'https://www.amazon.com/dp/B0CX23V2ZK', title: 'AirPods Pro 3 — Amazon.com' },
        { url: 'https://www.amazon.com/gp/your-orders/', title: 'Your Orders — Amazon.com' },
        { url: 'https://www.bestbuy.com/site/macbook-pro', title: 'MacBook Pro M4 — Best Buy' },
        // Health
        { url: 'https://www.webmd.com/vitamins/vitamin-d-deficiency', title: 'Vitamin D Deficiency: Symptoms, Causes — WebMD' },
        { url: 'https://mychart.ucsfhealth.org/mychart/', title: 'MyChart — UCSF Health' },
        // Travel
        { url: 'https://www.united.com/en/us/booking/confirmation', title: 'United Airlines — Booking Confirmation' },
        { url: 'https://www.airbnb.com/rooms/12345678', title: 'Cozy Shibuya Apartment — Airbnb' },
        { url: 'https://www.google.com/flights?q=SFO+to+JFK', title: 'Google Flights — SFO to JFK' },
        // Work/Tech
        { url: 'https://github.com/alex-rivera/datashadow', title: 'alex-rivera/datashadow — GitHub' },
        { url: 'https://stackoverflow.com/questions/12345678/react-force-graph', title: 'react-force-graph-2d not rendering — Stack Overflow' },
        { url: 'https://mail.google.com/mail/u/0/#inbox', title: 'Gmail — Inbox (12)' },
        { url: 'https://docs.google.com/document/d/abc123/edit', title: 'Sprint Planning Q1 2025 — Google Docs' },
        { url: 'https://calendar.google.com/calendar/u/0/r', title: 'Google Calendar' },
        // Personal
        { url: 'https://www.zillow.com/san-francisco-ca/', title: 'San Francisco CA Real Estate — Zillow' },
        { url: 'https://www.yelp.com/search?find_desc=engagement+rings&find_loc=San+Francisco', title: 'Engagement Rings in San Francisco — Yelp' },
    ];

    const items = [];
    for (let day = 0; day < 90; day++) {
        const browseCount = randomBetween(5, 15);
        for (let b = 0; b < browseCount; b++) {
            const ts = BASE + day * DAY + randomBetween(7, 23) * HOUR + randomBetween(0, 59) * 60000;
            const site = pick(sites);
            items.push({
                url: site.url,
                title: site.title,
                visit_count: randomBetween(1, 20),
                last_visit_time: ts,
                timestamp: isoDate(ts),
            });
        }
    }
    return items;
}

// ═══════════════════════════════════════════════════════════
// 5. Email Metadata — emails.json
// ═══════════════════════════════════════════════════════════
function generateEmailMetadata() {
    const emails = [
        // Work
        { from: 'mike.chen@techcorp.io', to: PERSONA.email, subject: 'Re: Sprint Planning — Q1 Goals' },
        { from: 'sarah.johnson@techcorp.io', to: PERSONA.email, subject: '1:1 Meeting Tomorrow at 3pm' },
        { from: 'sarah.johnson@techcorp.io', to: PERSONA.email, subject: 'Performance Review — Outstanding Work!' },
        { from: 'carlos.mendez@techcorp.io', to: PERSONA.email, subject: 'Code Review: PR #347 — Entity Graph Module' },
        { from: 'hr@techcorp.io', to: PERSONA.email, subject: 'Team Offsite in Napa — RSVP Required' },
        { from: 'payroll@techcorp.io', to: PERSONA.email, subject: 'Your Pay Stub for December 2024' },
        { from: PERSONA.email, to: 'mike.chen@techcorp.io', subject: 'Architecture Decision: gRPC vs REST' },
        // Financial
        { from: 'no-reply@chase.com', to: PERSONA.email, subject: 'Your December Statement is Ready' },
        { from: 'no-reply@chase.com', to: PERSONA.email, subject: 'Alert: Transaction of $2,847.00 at Apple Store' },
        { from: 'no-reply@coinbase.com', to: PERSONA.email, subject: 'Your Weekly Portfolio Summary — +12.4%' },
        { from: 'statements@fidelity.com', to: PERSONA.email, subject: 'Q4 2024 — 401(k) Statement Available' },
        { from: 'no-reply@creditkarma.com', to: PERSONA.email, subject: 'Your Credit Score Changed — Now 782' },
        { from: 'noreply@irs.gov', to: PERSONA.email, subject: 'Your 2024 Tax Return Has Been Accepted' },
        // Shopping
        { from: 'ship-confirm@amazon.com', to: PERSONA.email, subject: 'Your Amazon Order Has Shipped — AirPods Pro 3' },
        { from: 'order-confirm@amazon.com', to: PERSONA.email, subject: 'Order Confirmation: Standing Desk Converter' },
        { from: 'deals@bestbuy.com', to: PERSONA.email, subject: 'Your MacBook Pro M4 is Ready for Pickup' },
        // Travel
        { from: 'reservations@united.com', to: PERSONA.email, subject: 'Booking Confirmation — SFO to JFK Dec 20' },
        { from: 'noreply@airbnb.com', to: PERSONA.email, subject: 'Reservation Confirmed: Shibuya Apartment, Tokyo' },
        { from: 'noreply@google.com', to: PERSONA.email, subject: 'Your upcoming trip to New York' },
        // Health
        { from: 'appointments@ucsfhealth.org', to: PERSONA.email, subject: 'Appointment Reminder — Dr. Lisa Huang, Jan 15' },
        { from: 'labs@ucsfhealth.org', to: PERSONA.email, subject: 'Your Lab Results Are Available' },
        { from: 'pharmacy@cvs.com', to: PERSONA.email, subject: 'Your Prescription is Ready for Pickup' },
        // Personal
        { from: 'priya.patel@gmail.com', to: PERSONA.email, subject: 'Re: Dinner Saturday? Bringing David too!' },
        { from: 'emma.w@protonmail.com', to: PERSONA.email, subject: 'Found a great cooking class for us ❤️' },
        { from: 'david.kim@stanford.edu', to: PERSONA.email, subject: 'Stanford MS CS — Application Tips' },
        { from: 'emma.w@protonmail.com', to: PERSONA.email, subject: 'Look at this apartment listing! — 2BR Sunset District' },
        { from: 'priya.patel@gmail.com', to: PERSONA.email, subject: 'Photos from the hike — Golden Gate' },
        // Notifications
        { from: 'noreply@linkedin.com', to: PERSONA.email, subject: 'Mike Chen endorsed you for React' },
        { from: 'noreply@github.com', to: PERSONA.email, subject: '[datashadow] New issue: Force graph performance' },
        { from: 'security@google.com', to: PERSONA.email, subject: 'New sign-in from MacBook Pro in San Francisco' },
    ];

    const items = [];
    for (let day = 0; day < 90; day++) {
        const emailCount = randomBetween(2, 6);
        for (let e = 0; e < emailCount; e++) {
            const ts = BASE + day * DAY + randomBetween(6, 22) * HOUR + randomBetween(0, 59) * 60000;
            const em = pick(emails);
            items.push({
                from: em.from,
                to: em.to,
                subject: em.subject,
                date: isoDate(ts),
                snippet: `Preview of ${em.subject}...`,
                labels: ['INBOX'],
                isRead: Math.random() > 0.3,
            });
        }
    }
    return items;
}

// ═══════════════════════════════════════════════════════════
// 6. Social Media — posts.json (mixed Facebook/Twitter style)
// ═══════════════════════════════════════════════════════════
function generateSocialMedia() {
    const posts = [
        { text: 'Just shipped a major feature at work! The entity graph visualization is looking 🔥 #coding #react #typescript', mentions: [] },
        { text: 'Morning run across the Golden Gate Bridge — nothing beats this city 🌁 #sanfrancisco #running', mentions: [] },
        { text: '@mike.chen great pairing session today! That gRPC migration is going to be smooth', mentions: ['mike.chen'] },
        { text: 'Excited for our Tokyo trip in January! ✈️🇯🇵 Anyone have restaurant recommendations?', mentions: [] },
        { text: 'Coffee at Blue Bottle before work. The usual ☕ #bluebottle #sf', mentions: [] },
        { text: 'Finally hit my deadlift PR at Planet Fitness! 315lbs 💪 #fitness #planetfitness', mentions: [] },
        { text: '@priya.patel @david.kim amazing dinner last night! We need to do that more often', mentions: ['priya.patel', 'david.kim'] },
        { text: 'Reading about privacy in the age of AI. Everyone should check their Google Takeout data 🔐', mentions: [] },
        { text: 'Happy birthday @emma.wilson! Here\'s to many more adventures together ❤️', mentions: ['emma.wilson'] },
        { text: 'TechCorp hackathon was incredible. Our team built a privacy audit tool in 48 hours!', mentions: [] },
        { text: 'Great talk by @carlos.mendez at the SF React Meetup tonight 👏', mentions: ['carlos.mendez'] },
        { text: 'Weekend exploring the Ferry Building Marketplace. The oysters are unreal 🦪 #sf #foodie', mentions: [] },
        { text: 'System design interview prep is no joke. Grateful for friends who help me practice @david.kim', mentions: ['david.kim'] },
        { text: 'One year at TechCorp! Time flies when you love what you do 🎉', mentions: [] },
        { text: 'Saturday farmers market haul 🥬🍅 Trying a new recipe tonight', mentions: [] },
        { text: 'Just discovered my location history has 3000+ data points. Privacy is a myth. 😳', mentions: [] },
    ];

    const items = [];
    for (let day = 0; day < 90; day++) {
        if (Math.random() > 0.6) continue; // ~40% of days have posts
        const postCount = randomBetween(1, 3);
        for (let p = 0; p < postCount; p++) {
            const ts = BASE + day * DAY + randomBetween(8, 22) * HOUR;
            const post = pick(posts);
            items.push({
                text: post.text,
                timestamp: Math.floor(ts / 1000), // Unix seconds (Twitter-style)
                created_at: isoDate(ts),
                sender_name: 'Alex Rivera',
                mentions: post.mentions,
                likes: randomBetween(0, 120),
                retweets: randomBetween(0, 15),
            });
        }
    }
    return items;
}

// ═══════════════════════════════════════════════════════════
// Generate and write all files
// ═══════════════════════════════════════════════════════════
console.log('🔧 Generating dummy export data for DataShadow...\n');

const datasets = {
    'MyActivity.json': generateGoogleSearch(),
    'watch-history.json': generateYouTubeHistory(),
    'Records.json': generateLocationHistory(),
    'BrowserHistory.json': generateBrowserHistory(),
    'emails.json': generateEmailMetadata(),
    'posts.json': generateSocialMedia(),
};

for (const [filename, data] of Object.entries(datasets)) {
    const filepath = path.join(OUT_DIR, filename);
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(filepath, json, 'utf-8');
    const count = Array.isArray(data) ? data.length : (data.locations ? data.locations.length : '?');
    console.log(`  ✅ ${filename} — ${count} records (${(json.length / 1024).toFixed(1)} KB)`);
}

console.log(`\n📁 All files written to: ${OUT_DIR}`);
console.log('   You can upload these individually via the DataShadow UI,');
console.log('   or test parsers against these realistic formats.\n');
