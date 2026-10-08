const dongleIdRegex = /[a-f0-9]{16}/;
const logIdRegex = /[a-f0-9-]{20}/;
const numberRegex = /^\d+$/;

// The only place a url is read. Supported urls:
//   /                                  drive list
//   /:dongleId                         drive list of a device
//   /:dongleId/prime                   prime
//   /:dongleId/stream                  live stream
//   /:dongleId/:routeId                a drive
//   /:dongleId/:routeId/:start/:end    a slice of a drive, in seconds
//   /:dongleId/:start/:end             old-style drive link, in milliseconds
export function parseUrl(pathname) {
  const route = {
    dongleId: null,
    routeId: null,
    routeZoom: null,
    legacyZoom: null,
    prime: false,
    stream: false,
  };

  const [dongleId, page, start, end] = pathname.split('/').filter(Boolean);

  if (!dongleIdRegex.test(dongleId)) {
    return route;
  }
  route.dongleId = dongleId;

  if (page === 'prime' && start === undefined) {
    route.prime = true;
  } else if (page === 'stream' && start === undefined) {
    route.stream = true;
  } else if (logIdRegex.test(page)) {
    route.routeId = page;
    if (numberRegex.test(start) && numberRegex.test(end)) {
      route.routeZoom = { start: Number(start) * 1000, end: Number(end) * 1000 };
    }
  } else if (numberRegex.test(page) && numberRegex.test(start)) {
    route.legacyZoom = { start: Number(page), end: Number(start) };
  }

  return route;
}