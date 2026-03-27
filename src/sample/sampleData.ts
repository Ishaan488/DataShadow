import { ShadowEvent, DataSource, EventCategory } from '../core/types';

/**
 * Realistic sample data for Demo Mode.
 * Persona: "Alex Rivera" — Software engineer in San Francisco.
 * Triggers all risk dimensions with coherent, cross-referenced data.
 */

let counter = 0;
const id = () => `sample_${counter++}`;
const DAY = 86400000;
const HOUR = 3600000;
const BASE = Date.now() - 60 * DAY;

function evt(
    day: number,
    hour: number,
    source: DataSource,
    category: EventCategory,
    title: string,
    details: string,
    entities: string[]
): ShadowEvent {
    return {
        id: id(),
        timestamp: BASE + day * DAY + hour * HOUR + Math.floor(Math.random() * 3600000),
        source,
        category,
        title,
        details,
        entities,
    };
}

export const sampleEvents: ShadowEvent[] = [
    // ── Google Search ──
    evt(1, 8, 'google_search', 'financial', 'Chase Bank login', 'Products: [Search]', ['chase.com']),
    evt(2, 9, 'google_search', 'financial', 'best savings account interest rates 2025', '', ['google.com']),
    evt(3, 14, 'google_search', 'health', 'symptoms of vitamin D deficiency', '', ['webmd.com']),
    evt(4, 10, 'google_search', 'financial', 'Coinbase withdrawal limits', '', ['coinbase.com']),
    evt(5, 11, 'google_search', 'other', 'React 19 new features', '', ['react.dev']),
    evt(7, 9, 'google_search', 'travel', 'flights SFO to JFK December', '', ['google.com/flights']),
    evt(8, 15, 'google_search', 'shopping', 'best noise cancelling headphones 2025', '', ['amazon.com']),
    evt(10, 8, 'google_search', 'search', 'Sarah Johnson LinkedIn', '', ['Sarah Johnson', 'linkedin.com']),
    evt(12, 19, 'google_search', 'other', 'best engagement rings San Francisco', '', ['yelp.com']),
    evt(14, 10, 'google_search', 'financial', 'Roth IRA contribution limits 2025', '', ['irs.gov']),
    evt(16, 12, 'google_search', 'other', 'restaurants near Financial District SF', '', ['google.com/maps']),
    evt(18, 9, 'google_search', 'financial', 'credit score check free', '', ['creditkarma.com']),
    evt(20, 14, 'google_search', 'health', 'UCSF urgent care wait times', '', ['ucsfhealth.org']),
    evt(22, 10, 'google_search', 'search', 'how to negotiate salary tech industry', '', ['glassdoor.com']),

    // ── YouTube ──
    evt(1, 20, 'youtube', 'video', 'How Hackers Steal Your Data — 2025 Documentary', 'Channel: CyberSec Academy', ['CyberSec Academy']),
    evt(3, 21, 'youtube', 'video', 'Complete React 19 Tutorial for Beginners', 'Channel: Fireship', ['Fireship']),
    evt(5, 19, 'youtube', 'financial', 'Investing 101 — Stock Market for Beginners', 'Channel: Graham Stephan', ['Graham Stephan']),
    evt(8, 22, 'youtube', 'travel', 'Tokyo Travel Guide 2025 — Everything You Need', 'Channel: Abroad in Japan', ['Abroad in Japan']),
    evt(11, 20, 'youtube', 'video', 'System Design Interview — Step by Step Guide', 'Channel: Alex Xu', ['Alex Xu']),
    evt(14, 21, 'youtube', 'financial', 'Bitcoin Analysis — Is it Time to Buy?', 'Channel: Coin Bureau', ['Coin Bureau']),
    evt(17, 19, 'youtube', 'health', 'Best Running Routes in San Francisco', 'Channel: SF Running Club', ['SF Running Club']),
    evt(20, 22, 'youtube', 'video', 'The Hidden Cost of Free Apps — Privacy Documentary', 'Channel: Vox', ['Vox']),

    // ── Location ──
    evt(1, 7, 'location', 'location', '37.7749, -122.4194', 'Accuracy: 25m | Source: WIFI', ['37.77,-122.42']),
    evt(1, 9, 'location', 'location', '37.7897, -122.3972', 'Accuracy: 20m | Source: WIFI', ['37.79,-122.40']),
    evt(1, 18, 'location', 'location', '37.7694, -122.4283', 'Accuracy: 40m | Source: WIFI', ['37.77,-122.43']),
    evt(2, 7, 'location', 'location', '37.7749, -122.4194', 'Accuracy: 22m | Source: WIFI', ['37.77,-122.42']),
    evt(2, 9, 'location', 'location', '37.7897, -122.3972', 'Accuracy: 18m | Source: WIFI', ['37.79,-122.40']),
    evt(3, 8, 'location', 'location', '37.7855, -122.4090', 'Accuracy: 50m | Source: WIFI', ['37.79,-122.41']),
    evt(3, 9, 'location', 'location', '37.7897, -122.3972', 'Accuracy: 19m | Source: WIFI', ['37.79,-122.40']),
    evt(4, 7, 'location', 'location', '37.7749, -122.4194', 'Accuracy: 28m | Source: WIFI', ['37.77,-122.42']),
    evt(4, 10, 'location', 'location', '37.7901, -122.4013', 'Accuracy: 30m | Source: WIFI', ['37.79,-122.40']),
    evt(5, 7, 'location', 'location', '37.7749, -122.4194', 'Accuracy: 24m | Source: WIFI', ['37.77,-122.42']),
    evt(5, 9, 'location', 'location', '37.7897, -122.3972', 'Accuracy: 21m | Source: WIFI', ['37.79,-122.40']),
    evt(5, 18, 'location', 'location', '37.7694, -122.4283', 'Accuracy: 38m | Source: WIFI', ['37.77,-122.43']),
    evt(7, 11, 'location', 'location', '37.8199, -122.4783', 'Accuracy: 100m | Source: GPS', ['37.82,-122.48']),
    evt(10, 14, 'location', 'location', '37.7631, -122.4576', 'Accuracy: 20m | Source: WIFI', ['37.76,-122.46']),

    // ── Browser History ──
    evt(1, 8, 'browser_history', 'financial', 'Chase | Account Dashboard', 'secure.chase.com', ['chase.com']),
    evt(2, 10, 'browser_history', 'financial', 'Coinbase — Portfolio', 'coinbase.com', ['coinbase.com']),
    evt(3, 11, 'browser_history', 'social', 'Mike Chen — Software Engineer at TechCorp | LinkedIn', 'linkedin.com', ['Mike Chen', 'linkedin.com']),
    evt(4, 9, 'browser_history', 'shopping', 'AirPods Pro 3 — Amazon.com', 'amazon.com', ['amazon.com']),
    evt(5, 14, 'browser_history', 'health', 'Vitamin D Deficiency: Symptoms — WebMD', 'webmd.com', ['webmd.com']),
    evt(7, 10, 'browser_history', 'travel', 'United Airlines — Booking Confirmation', 'united.com', ['united.com']),
    evt(8, 16, 'browser_history', 'browsing', 'alex-rivera/datashadow — GitHub', 'github.com', ['github.com']),
    evt(10, 9, 'browser_history', 'health', 'MyChart — UCSF Health', 'mychart.ucsfhealth.org', ['ucsfhealth.org']),
    evt(12, 20, 'browser_history', 'other', 'San Francisco CA Real Estate — Zillow', 'zillow.com', ['zillow.com']),
    evt(14, 8, 'browser_history', 'financial', 'Credit Karma — Your Credit Score', 'creditkarma.com', ['creditkarma.com']),
    evt(16, 11, 'browser_history', 'financial', 'Fidelity — 401(k) Balance', 'fidelity.com', ['fidelity.com']),
    evt(18, 17, 'browser_history', 'other', 'Engagement Rings in San Francisco — Yelp', 'yelp.com', ['yelp.com']),

    // ── Email Metadata ──
    evt(1, 9, 'email', 'communication', 'Re: Sprint Planning — Q1 Goals', 'From: mike.chen@techcorp.io → To: alex.rivera.dev@gmail.com', ['Mike Chen', 'mike.chen@techcorp.io', 'Techcorp']),
    evt(2, 10, 'email', 'communication', '1:1 Meeting Tomorrow at 3pm', 'From: sarah.johnson@techcorp.io → To: alex.rivera.dev@gmail.com', ['Sarah Johnson', 'sarah.johnson@techcorp.io', 'Techcorp']),
    evt(3, 14, 'email', 'financial', 'Your December Statement is Ready', 'From: no-reply@chase.com → To: alex.rivera.dev@gmail.com', ['chase.com']),
    evt(4, 8, 'email', 'financial', 'Alert: Transaction of $2,847.00 at Apple Store', 'From: no-reply@chase.com → To: alex.rivera.dev@gmail.com', ['chase.com']),
    evt(5, 11, 'email', 'shopping', 'Your Amazon Order Has Shipped — AirPods Pro 3', 'From: ship-confirm@amazon.com → To: alex.rivera.dev@gmail.com', ['amazon.com']),
    evt(7, 15, 'email', 'travel', 'Booking Confirmation — SFO to JFK Dec 20', 'From: reservations@united.com → To: alex.rivera.dev@gmail.com', ['united.com']),
    evt(8, 10, 'email', 'health', 'Appointment Reminder — Dr. Lisa Huang, Jan 15', 'From: appointments@ucsfhealth.org → To: alex.rivera.dev@gmail.com', ['Dr. Lisa Huang', 'ucsfhealth.org']),
    evt(10, 9, 'email', 'financial', 'Your Weekly Portfolio Summary — +12.4%', 'From: no-reply@coinbase.com → To: alex.rivera.dev@gmail.com', ['coinbase.com']),
    evt(12, 16, 'email', 'communication', 'Re: Dinner Saturday? Bringing David too!', 'From: priya.patel@gmail.com → To: alex.rivera.dev@gmail.com', ['Priya Patel', 'priya.patel@gmail.com']),
    evt(14, 8, 'email', 'communication', 'Found a great cooking class for us ❤️', 'From: emma.w@protonmail.com → To: alex.rivera.dev@gmail.com', ['Emma Wilson', 'emma.w@protonmail.com']),
    evt(16, 11, 'email', 'financial', 'Your Credit Score Changed — Now 782', 'From: no-reply@creditkarma.com → To: alex.rivera.dev@gmail.com', ['creditkarma.com']),
    evt(18, 14, 'email', 'communication', 'Stanford MS CS — Application Tips', 'From: david.kim@stanford.edu → To: alex.rivera.dev@gmail.com', ['David Kim', 'david.kim@stanford.edu', 'Stanford']),
    evt(20, 9, 'email', 'financial', 'Q4 2024 — 401(k) Statement Available', 'From: statements@fidelity.com → To: alex.rivera.dev@gmail.com', ['fidelity.com']),

    // ── Social Media ──
    evt(2, 12, 'social_media', 'social', 'Just shipped a major feature at work! The entity graph visualization is looking 🔥 #coding #react', 'By: Alex Rivera', ['Alex Rivera', 'coding', 'react']),
    evt(5, 10, 'social_media', 'social', 'Morning run across the Golden Gate Bridge — nothing beats this city 🌁 #sanfrancisco', 'By: Alex Rivera', ['Alex Rivera', 'sanfrancisco']),
    evt(8, 19, 'social_media', 'social', '@mike.chen great pairing session today! That gRPC migration is going to be smooth', 'By: Alex Rivera', ['Alex Rivera', 'mike.chen']),
    evt(11, 14, 'social_media', 'social', 'Excited for our Tokyo trip in January! ✈️🇯🇵', 'By: Alex Rivera', ['Alex Rivera']),
    evt(14, 18, 'social_media', 'social', 'Finally hit my deadlift PR at Planet Fitness! 315lbs 💪 #fitness', 'By: Alex Rivera', ['Alex Rivera', 'fitness']),
    evt(17, 11, 'social_media', 'social', '@priya.patel @david.kim amazing dinner last night!', 'By: Alex Rivera', ['Alex Rivera', 'priya.patel', 'david.kim']),
    evt(20, 20, 'social_media', 'social', 'Happy birthday @emma.wilson! Here\'s to many more adventures together ❤️', 'By: Alex Rivera', ['Alex Rivera', 'emma.wilson']),
    evt(22, 15, 'social_media', 'social', 'One year at TechCorp! Time flies when you love what you do 🎉', 'By: Alex Rivera', ['Alex Rivera', 'Techcorp']),
];