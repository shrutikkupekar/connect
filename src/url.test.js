import { describe, expect, it } from 'vitest';

import { parseUrl } from './url';

const DONGLE = '0000aaaa0000aaaa';
const LOG = '2026-08-06--12-00-00';

describe('parseUrl', () => {
  const EMPTY = { dongleId: null, routeId: null, routeZoom: null, legacyZoom: null, prime: false, stream: false };
  const DEVICE = { ...EMPTY, dongleId: DONGLE };

  it.each([
    ['/', EMPTY],
    ['/referrals', EMPTY],
    ['/prime', EMPTY],
    ['/not-a-device/prime', EMPTY],
    ['/auth/code/provider', EMPTY],
    [`/${DONGLE}`, DEVICE],
    [`/${DONGLE}/prime`, { ...DEVICE, prime: true }],
    [`/${DONGLE}/prime/extra`, DEVICE],
    [`/${DONGLE}/stream`, { ...DEVICE, stream: true }],
    [`/${DONGLE}/stream/extra`, DEVICE],
    [`/${DONGLE}/${LOG}`, { ...DEVICE, routeId: LOG }],
    [`/${DONGLE}/${LOG}/10/20`, { ...DEVICE, routeId: LOG, routeZoom: { start: 10000, end: 20000 } }],
    [`/${DONGLE}/${LOG}/0/20`, { ...DEVICE, routeId: LOG, routeZoom: { start: 0, end: 20000 } }],
    [`/${DONGLE}/${LOG}/abc/20`, { ...DEVICE, routeId: LOG }],
    [`/${DONGLE}/1000/2000`, { ...DEVICE, legacyZoom: { start: 1000, end: 2000 } }],
    [`/${DONGLE}/1000`, DEVICE],
  ])('%s', (pathname, expected) => {
    expect(parseUrl(pathname)).toEqual(expected);
  });
});