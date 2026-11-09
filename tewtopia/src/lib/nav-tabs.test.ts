import assert from 'node:assert/strict';
import { test } from 'node:test';
import { navTabs } from './nav-tabs.ts';

const labels = (tabs: ReturnType<typeof navTabs>) => tabs.map((tab) => tab.label);
const none = { hasRequests: false, hasOffers: false };

test('guest tabs', () => {
  assert.deepEqual(labels(navTabs(null, none)), ['Find tutors', 'Request board']);
});

test('student and tutor tabs', () => {
  assert.deepEqual(labels(navTabs('student', none)), ['Dashboard', 'Find tutors', 'My requests', 'Profile', 'Settings']);
  assert.deepEqual(labels(navTabs('tutor', none)), ['Dashboard', 'Request board', 'My offers', 'Tutor profile', 'Settings']);
});

test('a role switcher keeps the page for rows they still own', () => {
  assert.deepEqual(labels(navTabs('tutor', { hasRequests: true, hasOffers: false })), [
    'Dashboard',
    'Request board',
    'My offers',
    'My requests',
    'Tutor profile',
    'Settings',
  ]);
  assert.deepEqual(labels(navTabs('student', { hasRequests: false, hasOffers: true })), [
    'Dashboard',
    'Find tutors',
    'My requests',
    'My offers',
    'Profile',
    'Settings',
  ]);
});

test('badges point at the right pages', () => {
  const tabs = navTabs('tutor', { hasRequests: true, hasOffers: true });
  assert.equal(tabs.find((tab) => tab.label === 'My requests')?.badge, 'pendingOffers');
  assert.equal(tabs.find((tab) => tab.label === 'My offers')?.badge, 'acceptedOffers');
  assert.equal(tabs.find((tab) => tab.label === 'Dashboard')?.badge, undefined);
});
