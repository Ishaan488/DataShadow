import { ShadowEvent } from '../core/types';

/**
 * Realistic sample data for demo mode.
 */

const BASE_TIME = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days ago
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

let id = 0;
const nid = () => `demo_${id++}`;

export const sampleEvents: ShadowEvent[] = [
    // Google Search events
    { id: nid(), timestamp: BASE_TIME + 1 * DAY + 9 * HOUR, source: 'google_search', category: 'search', title: 'best password manager 2025', details: '["Search"]', entities: [] },
    { id: nid(), timestamp: BASE_TIME + 1 * DAY + 10 * HOUR, source: 'google_search', category: 'financial', title: 'Chase Bank online login', details: '["Search"]', entities: ['Chase Bank'] },
    { id: nid(), timestamp: BASE_TIME + 2 * DAY + 8 * HOUR, source: 'google_search', category: 'health', title: 'symptoms of vitamin D deficiency', details: '["Search"]', entities: [] },
    { id: nid(), timestamp: BASE_TIME + 3 * DAY + 14 * HOUR, source: 'google_search', category: 'shopping', title: 'Amazon Prime Day deals electronics', details: '["Search"]', entities: ['Amazon'] },
    { id: nid(), timestamp: BASE_TIME + 4 * DAY + 11 * HOUR, source: 'google_search', category: 'search', title: 'how to set up two factor authentication', details: '["Search"]', entities: [] },
    { id: nid(), timestamp: BASE_TIME + 5 * DAY + 16 * HOUR, source: 'google_search', category: 'travel', title: 'flight tickets NYC to San Francisco', details: '["Search"]', entities: ['NYC', 'San Francisco'] },
    { id: nid(), timestamp: BASE_TIME + 6 * DAY + 9 * HOUR, source: 'google_search', category: 'financial', title: 'cryptocurrency investment strategies 2025', details: '["Search"]', entities: [] },
    { id: nid(), timestamp: BASE_TIME + 7 * DAY + 13 * HOUR, source: 'google_search', category: 'search', title: 'React TypeScript force graph visualization', details: '["Search"]', entities: [] },
    { id: nid(), timestamp: BASE_TIME + 8 * DAY + 10 * HOUR, source: 'google_search', category: 'search', title: 'John Smith LinkedIn profile', details: '["Search"]', entities: ['John Smith'] },
    { id: nid(), timestamp: BASE_TIME + 9 * DAY + 15 * HOUR, source: 'google_search', category: 'financial', title: 'best credit cards with travel rewards', details: '["Search"]', entities: [] },
    { id: nid(), timestamp: BASE_TIME + 10 * DAY + 8 * HOUR, source: 'google_search', category: 'search', title: 'Stanford University admissions requirements', details: '["Search"]', entities: ['Stanford University'] },
    { id: nid(), timestamp: BASE_TIME + 12 * DAY + 11 * HOUR, source: 'google_search', category: 'health', title: 'nearest pharmacy open now', details: '["Search"]', entities: [] },
    { id: nid(), timestamp: BASE_TIME + 14 * DAY + 9 * HOUR, source: 'google_search', category: 'financial', title: 'stock portfolio diversification tips', details: '["Search"]', entities: [] },
    { id: nid(), timestamp: BASE_TIME + 15 * DAY + 20 * HOUR, source: 'google_search', category: 'search', title: 'Sarah Johnson contact number', details: '["Search"]', entities: ['Sarah Johnson'] },

    // YouTube watch history
    { id: nid(), timestamp: BASE_TIME + 1 * DAY + 20 * HOUR, source: 'youtube', category: 'video', title: 'How Hackers Steal Your Data — Full Documentary', details: 'Channel: CyberSec Academy', entities: ['CyberSec Academy'] },
    { id: nid(), timestamp: BASE_TIME + 2 * DAY + 21 * HOUR, source: 'youtube', category: 'video', title: 'Complete React Tutorial 2025', details: 'Channel: Fireship', entities: ['Fireship'] },
    { id: nid(), timestamp: BASE_TIME + 3 * DAY + 19 * HOUR, source: 'youtube', category: 'video', title: 'Investing for Beginners — Warren Buffett', details: 'Channel: Finance Hub', entities: ['Warren Buffett', 'Finance Hub'] },
    { id: nid(), timestamp: BASE_TIME + 5 * DAY + 22 * HOUR, source: 'youtube', category: 'video', title: 'Day in the Life of a Software Engineer at Google', details: 'Channel: TechLead', entities: ['Google', 'TechLead'] },
    { id: nid(), timestamp: BASE_TIME + 7 * DAY + 20 * HOUR, source: 'youtube', category: 'video', title: 'San Francisco Travel Guide 2025', details: 'Channel: Travel Vlogs', entities: ['San Francisco', 'Travel Vlogs'] },
    { id: nid(), timestamp: BASE_TIME + 10 * DAY + 21 * HOUR, source: 'youtube', category: 'video', title: 'Python Machine Learning Crash Course', details: 'Channel: Sentdex', entities: ['Sentdex'] },
    { id: nid(), timestamp: BASE_TIME + 13 * DAY + 18 * HOUR, source: 'youtube', category: 'video', title: 'Home Network Security Setup Guide', details: 'Channel: NetworkChuck', entities: ['NetworkChuck'] },
    { id: nid(), timestamp: BASE_TIME + 16 * DAY + 20 * HOUR, source: 'youtube', category: 'video', title: 'Crypto Market Analysis — Bitcoin Predictions', details: 'Channel: CoinBureau', entities: ['CoinBureau'] },

    // Location data
    { id: nid(), timestamp: BASE_TIME + 1 * DAY + 8 * HOUR, source: 'location', category: 'location', title: 'Home — Maple Street Apartments', details: '123 Maple St, Apt 4B', entities: ['Maple Street Apartments'] },
    { id: nid(), timestamp: BASE_TIME + 1 * DAY + 9 * HOUR, source: 'location', category: 'location', title: 'Starbucks — Downtown', details: '456 Main St', entities: ['Starbucks'] },
    { id: nid(), timestamp: BASE_TIME + 1 * DAY + 10 * HOUR, source: 'location', category: 'location', title: 'TechCorp Office', details: '789 Innovation Blvd', entities: ['TechCorp'] },
    { id: nid(), timestamp: BASE_TIME + 2 * DAY + 8 * HOUR, source: 'location', category: 'location', title: 'Home — Maple Street Apartments', details: '123 Maple St, Apt 4B', entities: ['Maple Street Apartments'] },
    { id: nid(), timestamp: BASE_TIME + 2 * DAY + 9 * HOUR, source: 'location', category: 'location', title: 'TechCorp Office', details: '789 Innovation Blvd', entities: ['TechCorp'] },
    { id: nid(), timestamp: BASE_TIME + 2 * DAY + 18 * HOUR, source: 'location', category: 'location', title: 'Planet Fitness — West Side', details: '321 Gym Ave', entities: ['Planet Fitness'] },
    { id: nid(), timestamp: BASE_TIME + 3 * DAY + 8 * HOUR, source: 'location', category: 'location', title: 'Home — Maple Street Apartments', details: '123 Maple St, Apt 4B', entities: ['Maple Street Apartments'] },
    { id: nid(), timestamp: BASE_TIME + 3 * DAY + 9 * HOUR, source: 'location', category: 'location', title: 'TechCorp Office', details: '789 Innovation Blvd', entities: ['TechCorp'] },
    { id: nid(), timestamp: BASE_TIME + 5 * DAY + 12 * HOUR, source: 'location', category: 'location', title: 'Chase Bank Branch', details: '555 Financial Dr', entities: ['Chase Bank'] },
    { id: nid(), timestamp: BASE_TIME + 8 * DAY + 14 * HOUR, source: 'location', category: 'location', title: 'Dr. Martinez Family Clinic', details: '222 Health Way', entities: ['Dr. Martinez'] },
    { id: nid(), timestamp: BASE_TIME + 12 * DAY + 10 * HOUR, source: 'location', category: 'location', title: 'SFO International Airport', details: 'San Francisco, CA', entities: ['SFO', 'San Francisco'] },
    { id: nid(), timestamp: BASE_TIME + 15 * DAY + 8 * HOUR, source: 'location', category: 'location', title: 'Home — Maple Street Apartments', details: '123 Maple St, Apt 4B', entities: ['Maple Street Apartments'] },
    { id: nid(), timestamp: BASE_TIME + 20 * DAY + 9 * HOUR, source: 'location', category: 'location', title: 'TechCorp Office', details: '789 Innovation Blvd', entities: ['TechCorp'] },

    // Browser history
    { id: nid(), timestamp: BASE_TIME + 1 * DAY + 9.5 * HOUR, source: 'browser_history', category: 'financial', title: 'Chase Online Banking — Account Summary', details: 'chase.com', entities: ['chase.com'] },
    { id: nid(), timestamp: BASE_TIME + 1 * DAY + 10.5 * HOUR, source: 'browser_history', category: 'browsing', title: 'Stack Overflow — React Force Graph', details: 'stackoverflow.com', entities: ['stackoverflow.com'] },
    { id: nid(), timestamp: BASE_TIME + 2 * DAY + 12 * HOUR, source: 'browser_history', category: 'social', title: 'LinkedIn — John Smith Profile', details: 'linkedin.com', entities: ['linkedin.com', 'John Smith'] },
    { id: nid(), timestamp: BASE_TIME + 3 * DAY + 11 * HOUR, source: 'browser_history', category: 'shopping', title: 'Amazon — AirPods Pro 3 — Order Confirmation', details: 'amazon.com', entities: ['amazon.com'] },
    { id: nid(), timestamp: BASE_TIME + 4 * DAY + 14 * HOUR, source: 'browser_history', category: 'financial', title: 'Coinbase — Portfolio Dashboard', details: 'coinbase.com', entities: ['coinbase.com'] },
    { id: nid(), timestamp: BASE_TIME + 5 * DAY + 16 * HOUR, source: 'browser_history', category: 'travel', title: 'United Airlines — Flight Booking SFO', details: 'united.com', entities: ['united.com'] },
    { id: nid(), timestamp: BASE_TIME + 6 * DAY + 10 * HOUR, source: 'browser_history', category: 'browsing', title: 'Gmail — Inbox', details: 'mail.google.com', entities: ['mail.google.com'] },
    { id: nid(), timestamp: BASE_TIME + 7 * DAY + 15 * HOUR, source: 'browser_history', category: 'social', title: 'Twitter — Home Timeline', details: 'twitter.com', entities: ['twitter.com'] },
    { id: nid(), timestamp: BASE_TIME + 9 * DAY + 11 * HOUR, source: 'browser_history', category: 'health', title: 'WebMD — Vitamin D Deficiency Symptoms', details: 'webmd.com', entities: ['webmd.com'] },
    { id: nid(), timestamp: BASE_TIME + 11 * DAY + 14 * HOUR, source: 'browser_history', category: 'financial', title: 'Fidelity — 401k Balance', details: 'fidelity.com', entities: ['fidelity.com'] },

    // Email metadata
    { id: nid(), timestamp: BASE_TIME + 1 * DAY + 7 * HOUR, source: 'email', category: 'communication', title: 'Re: Project Sprint Planning', details: 'From: mike.chen@techcorp.com → To: user@gmail.com', entities: ['mike.chen@techcorp.com'] },
    { id: nid(), timestamp: BASE_TIME + 2 * DAY + 10 * HOUR, source: 'email', category: 'financial', title: 'Your Chase Statement is Ready', details: 'From: no-reply@chase.com → To: user@gmail.com', entities: ['no-reply@chase.com'] },
    { id: nid(), timestamp: BASE_TIME + 3 * DAY + 15 * HOUR, source: 'email', category: 'shopping', title: 'Your Amazon Order Has Shipped', details: 'From: ship-confirm@amazon.com → To: user@gmail.com', entities: ['ship-confirm@amazon.com'] },
    { id: nid(), timestamp: BASE_TIME + 4 * DAY + 9 * HOUR, source: 'email', category: 'communication', title: 'Meeting Tomorrow at 3pm', details: 'From: sarah.johnson@techcorp.com → To: user@gmail.com', entities: ['sarah.johnson@techcorp.com'] },
    { id: nid(), timestamp: BASE_TIME + 5 * DAY + 11 * HOUR, source: 'email', category: 'travel', title: 'Your United Airlines Booking Confirmation', details: 'From: reservations@united.com → To: user@gmail.com', entities: ['reservations@united.com'] },
    { id: nid(), timestamp: BASE_TIME + 6 * DAY + 8 * HOUR, source: 'email', category: 'communication', title: 'Invitation: Team Offsite in SF', details: 'From: hr@techcorp.com → To: user@gmail.com', entities: ['hr@techcorp.com'] },
    { id: nid(), timestamp: BASE_TIME + 8 * DAY + 14 * HOUR, source: 'email', category: 'health', title: 'Appointment Reminder — Dr. Martinez', details: 'From: appointments@familyclinic.com → To: user@gmail.com', entities: ['appointments@familyclinic.com', 'Dr. Martinez'] },
    { id: nid(), timestamp: BASE_TIME + 10 * DAY + 9 * HOUR, source: 'email', category: 'financial', title: 'Coinbase: Your Weekly Portfolio Summary', details: 'From: no-reply@coinbase.com → To: user@gmail.com', entities: ['no-reply@coinbase.com'] },
    { id: nid(), timestamp: BASE_TIME + 12 * DAY + 16 * HOUR, source: 'email', category: 'communication', title: 'Re: Weekend Plans?', details: 'From: alex.rivera@gmail.com → To: user@gmail.com', entities: ['alex.rivera@gmail.com'] },
    { id: nid(), timestamp: BASE_TIME + 14 * DAY + 10 * HOUR, source: 'email', category: 'financial', title: 'Your Fidelity 401(k) Quarterly Statement', details: 'From: statements@fidelity.com → To: user@gmail.com', entities: ['statements@fidelity.com'] },

    // Social media
    { id: nid(), timestamp: BASE_TIME + 2 * DAY + 20 * HOUR, source: 'social_media', category: 'social', title: 'Just started learning React — loving it so far! #coding #webdev', details: 'By: UserProfile', entities: [] },
    { id: nid(), timestamp: BASE_TIME + 5 * DAY + 19 * HOUR, source: 'social_media', category: 'social', title: 'Excited for the SF trip next week!', details: 'By: UserProfile', entities: ['San Francisco'] },
    { id: nid(), timestamp: BASE_TIME + 8 * DAY + 21 * HOUR, source: 'social_media', category: 'social', title: '@mike.chen great presentation today! Team killed it', details: 'By: UserProfile', entities: ['mike.chen'] },
    { id: nid(), timestamp: BASE_TIME + 11 * DAY + 18 * HOUR, source: 'social_media', category: 'social', title: 'Coffee at the usual spot #starbucks #downtown', details: 'By: UserProfile', entities: ['Starbucks'] },
    { id: nid(), timestamp: BASE_TIME + 15 * DAY + 20 * HOUR, source: 'social_media', category: 'social', title: 'Finally hit my fitness goal this month! #planetfitness', details: 'By: UserProfile', entities: ['Planet Fitness'] },
];
    