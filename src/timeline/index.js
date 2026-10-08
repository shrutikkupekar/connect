import store from '../store';

// While a drive video is on screen, its <video> element is the playback clock.
let activeVideo = null;
let activeVideoStartOffset = 0;

export function setActiveVideo(video, videoStartOffset = 0) {
  activeVideo = video;
  activeVideoStartOffset = videoStartOffset || 0;
}

export function clearActiveVideo(video) {
  if (activeVideo === video) {
    activeVideo = null;
  }
}

// route offset (ms) of the active video, or null when no video is driving playback
export function videoOffset() {
  if (!activeVideo || activeVideo.readyState === 0) {
    return null;
  }
  return activeVideo.currentTime * 1000 + activeVideoStartOffset;
}

/**
 * Get current playback offset
 *
 * @param {object} state
 * @returns {number}
 */
export function currentOffset(state = null) {
  if (!state) {
    state = store.getState();
  }

  /** @type {number} */
  let offset = videoOffset();
  if (offset !== null) {
    // the video is the clock
  } else if (state.offset === null && state.loop?.startTime) {
    offset = state.loop.startTime;
  } else {
    const playSpeed = state.isBufferingVideo ? 0 : state.desiredPlaySpeed;
    offset = state.offset + ((Date.now() - state.startTime) * playSpeed);
  }

  if (offset !== null && state.loop?.startTime) {
    // respect the loop
    const loopOffset = state.loop.startTime;
    if (offset < loopOffset) {
      offset = loopOffset;
    } else if (offset > loopOffset + state.loop.duration) {
      offset = ((offset - loopOffset) % state.loop.duration) + loopOffset;
    }
  }
  return offset;
}