const dongleIdRegex = /[a-f0-9]{16}/;
const logIdRegex = /[a-f0-9-]{20}/;
const numberRegex = /^\d+$/;

export function getDongleID(pathname) {
  let parts = pathname.split('/');
  parts = parts.filter((m) => m.length);

  if (!dongleIdRegex.test(parts[0])) {
    return null;
  }

  return parts[0] || null;
}

export function getZoom(pathname) {
  let parts = pathname.split('/');
  parts = parts.filter((m) => m.length);
  if (parts.length >= 3 && parts[0] !== 'auth') {
    return {
      start: Number(parts[1]),
      end: Number(parts[2]),
    };
  }
  return null;
}

export function getRouteId(pathname) {
  let parts = pathname.split('/');
  parts = parts.filter((m) => m.length);

  if (parts.length >= 2 && logIdRegex.test(parts[1])) {
    return parts[1];
  }
  return null;
}

export function getRouteZoom(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (getRouteId(pathname) && parts.length >= 4) {
    return {
      start: Number(parts[2]) * 1000,
      end: Number(parts[3]) * 1000,
    };
  }
  return null;
}

export function getPrimeNav(pathname) {
  let parts = pathname.split('/');
  parts = parts.filter((m) => m.length);

  if (parts.length === 2 && dongleIdRegex.test(parts[0]) && parts[1] === 'prime') {
    return true;
  }
  return false;
}

export function getStreamNav(pathname) {
  let parts = pathname.split('/');
  parts = parts.filter((m) => m.length);

  if (parts.length === 2 && dongleIdRegex.test(parts[0]) && parts[1] === 'stream') {
    return true;
  }
  return false;
}

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
