import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accountMenu, navTabs } from './nav-tabs.ts';

const labels = (tabs: ReturnType<typeof navTabs>) => tabs.map((tab) => tab.label);
const none = { hasRequests: false, hasOffers: false };

test('guest tabs', () => {
  assert.deepEqual(labels(navTabs(null, none)), ['Find tutors', 'Request board']);
});

test('student and tutor tabs', () => {
  assert.deepEqual(labels(navTabs('student', none)), ['Dashboard', 'Find tutors', 'My requests']);
  assert.deepEqual(labels(navTabs('tutor', none)), ['Dashboard', 'Request board', 'My offers']);
});

test('a role switcher keeps the page for rows they still own', () => {
  assert.deepEqual(labels(navTabs('tutor', { hasRequests: true, hasOffers: false })), [
    'Dashboard',
    'Request board',
    'My offers',
    'My requests',
  ]);
  assert.deepEqual(labels(navTabs('student', { hasRequests: false, hasOffers: true })), [
    'Dashboard',
    'Find tutors',
    'My requests',
    'My offers',
  ]);
});

test('badges point at the right pages', () => {
  const tabs = navTabs('tutor', { hasRequests: true, hasOffers: true });
  assert.equal(tabs.find((tab) => tab.label === 'My requests')?.badge, 'pendingOffers');
  assert.equal(tabs.find((tab) => tab.label === 'My offers')?.badge, 'acceptedOffers');
  assert.equal(tabs.find((tab) => tab.label === 'Dashboard')?.badge, undefined);
});

test('account menu (avatar): profile pages and settings by role', () => {
  assert.deepEqual(
    accountMenu('student').map((item) => [item.label, item.href]),
    [
      ['Profile', '/main/profile'],
      ['Settings', '/main/settings'],
    ],
  );
  assert.deepEqual(
    accountMenu('tutor').map((item) => [item.label, item.href]),
    [
      ['Tutor profile', '/main/tutor-profile'],
      ['Profile', '/main/profile'],
      ['Settings', '/main/settings'],
    ],
  );
});
