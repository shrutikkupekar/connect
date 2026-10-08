/* eslint-disable camelcase */
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { CircularProgress, Typography } from '@material-ui/core';
import ReactPlayer from 'react-player/file';

import { api } from '../../api/backend';

import Colors from '../../colors';
import { ErrorOutline } from '../../icons';
import { currentOffset, setActiveVideo, clearActiveVideo, videoOffset } from '../../timeline';
import { bufferVideo } from '../../timeline/playback';
import { isIos, isFirefox } from '../../utils/browser.js';

const VideoOverlay = ({ loading, error }) => {
  let content;
  if (error) {
    content = (
      <>
        <ErrorOutline className="mb-2" />
        <Typography>{error}</Typography>
      </>
    );
  } else if (loading) {
    content = <CircularProgress style={{ color: Colors.white }} thickness={4} size={50} />;
  } else {
    return null;
  }
  return (
    <div className="z-50 absolute h-full w-full bg-[#16181AAA]">
      <div className="relative text-center top-[calc(50%_-_25px)]">
        {content}
      </div>
    </div>
  );
};

class DriveVideo extends Component {
  constructor(props) {
    super(props);

    this.onVideoBuffering = this.onVideoBuffering.bind(this);
    this.onHlsError = this.onHlsError.bind(this);
    this.onVideoError = this.onVideoError.bind(this);
    this.onVideoResume = this.onVideoResume.bind(this);
    this.onTimeUpdate = this.onTimeUpdate.bind(this);
    this.onEnded = this.onEnded.bind(this);

    this.videoPlayer = React.createRef();
    this.video = null;

    this.state = {
      src: null,
      videoError: null,
    };
  }

  componentDidMount() {
    this.updateVideoSource({});
  }

  componentDidUpdate(prevProps) {
    this.updateVideoSource(prevProps);

    // a seek moved the requested position away from where the video is
    const playing = videoOffset();
    if (prevProps.offset !== this.props.offset && playing !== null && Math.abs(this.props.offset - playing) > 100) {
      this.seekVideo(this.props.offset);
    }
  }

  componentWillUnmount() {
    this.detachVideo();
  }

  onVideoBuffering() {
    this.props.dispatch(bufferVideo(true));
  }

  // keep playback inside the selected loop
  onTimeUpdate() {
    const { video } = this;
    if (!video || video.seeking) {
      return;
    }
    // the video is moving again, so it isn't buffering
    if (this.props.isBufferingVideo && video.readyState >= 3) {
      this.props.dispatch(bufferVideo(false));
    }

    const { loop } = this.props;
    const offset = videoOffset();
    if (!loop || offset === null) {
      return;
    }
    if (offset < loop.startTime - 500 || offset >= loop.startTime + loop.duration) {
      this.restartLoop();
    }
  }

  onEnded() {
    this.restartLoop();
  }

  restartLoop() {
    const { loop, desiredPlaySpeed } = this.props;
    this.seekVideo(loop ? loop.startTime : 0);
    if (desiredPlaySpeed && this.video) {
      this.video.play().catch(() => {});
    }
  }

  /**
   * @param {Error} e
   */
  onHlsError(e) {
    const { dispatch } = this.props;
    dispatch(bufferVideo(true));

    if (e.type === 'mediaError' && (e.details === 'bufferStalledError' || e.details === 'bufferNudgeOnStall')) {
      // buffer but no error
      return;
    }

    if (e.type === 'networkError' && (e.response?.code === 404)) {
      this.setState({ videoError: 'This video segment has not uploaded yet or has been deleted.' });
    } else {
      this.setState({ videoError: 'Unable to load video' });
    }
  }

  /**
   * @param {Error} e
   * @param {any} [data]
   */
  onVideoError(e, data) {
    if (!e) {
      console.warn('Unknown video error', { e, data });
      return;
    }

    if (e === 'hlsError') {
      this.onHlsError(data);
      return;
    }

    if (e.name === 'AbortError') {
      // ignore
      return;
    }

    if (e.target?.src?.startsWith(window.location.origin) && e.target.src.endsWith('undefined')) {
      // TODO: figure out why the src isn't set properly
      // Sometimes an error will be thrown because we try to play
      // src: "https://connect.comma.ai/.../undefined"
      console.warn('Video error with undefined src, ignoring', { e, data });
      return;
    }

    const { dispatch } = this.props;
    dispatch(bufferVideo(true));

    if (e.type === 'networkError') {
      console.error('Network error', { e, data });
      this.setState({ videoError: 'Unable to load video. Check network connection.' });
      return;
    }

    const videoError = e.response?.code === 404
      ? 'This video segment has not uploaded yet or has been deleted.'
      : (e.response?.text || 'Unable to load video');
    this.setState({ videoError });
  }

  onVideoResume() {
    const { videoError } = this.state;
    if (videoError) this.setState({ videoError: null });
    if (this.props.isBufferingVideo) this.props.dispatch(bufferVideo(false));
  }

  attachVideo(video) {
    if (this.video === video) {
      return;
    }
    this.detachVideo();
    // start where the timeline is, then let the video drive
    const target = currentOffset();
    this.video = video;
    video.addEventListener('timeupdate', this.onTimeUpdate);
    video.addEventListener('ended', this.onEnded);
    video.addEventListener('canplay', this.onVideoResume);
    setActiveVideo(video, this.props.currentRoute?.videoStartOffset);
    this.seekVideo(target);
  }

  detachVideo() {
    if (this.video) {
      this.video.removeEventListener('timeupdate', this.onTimeUpdate);
      this.video.removeEventListener('ended', this.onEnded);
      this.video.removeEventListener('canplay', this.onVideoResume);
      clearActiveVideo(this.video);
      this.video = null;
    }
  }

  seekVideo(offset) {
    if (!this.video) {
      return;
    }
    const startOffset = this.props.currentRoute?.videoStartOffset || 0;
    this.video.currentTime = Math.max(0, (offset - startOffset) / 1000);
  }

  updateVideoSource(prevProps) {
    let { src } = this.state;
    const { currentRoute } = this.props;
    if (!currentRoute) {
      this.detachVideo();
      if (src !== '') {
        this.setState({ src: '', videoError: null });
      }
      return;
    }

    if (src === '' || !prevProps.currentRoute || prevProps.currentRoute?.fullname !== currentRoute.fullname) {
      src = api.video.getQcameraStreamUrl(currentRoute.fullname, currentRoute.share_exp, currentRoute.share_sig);
      this.detachVideo();
      this.setState({ src, videoError: null });
    }
  }

  render() {
    const { desiredPlaySpeed, isBufferingVideo, currentRoute, onAudioStatusChange, isMuted } = this.props;
    const { src, videoError } = this.state;

    const onPlayerReady = (player) => {
      this.attachVideo(player.getInternalPlayer());
      if (isIos()) { // ios does not support hls.js and on other browsers hls.js does not directly play the m3u8 so audioTracks are not visible
        const videoElement = player.getInternalPlayer();
        if (videoElement && videoElement.audioTracks && videoElement.audioTracks.length > 0) {
          if (onAudioStatusChange) {
            onAudioStatusChange(true);
          }
        }
      } else { // on other platforms, inspect audio tracks before hls.js changes things
        const hlsPlayer = player.getInternalPlayer('hls');
        if (hlsPlayer) {
          hlsPlayer.on('hlsBufferCodecs', (event, data) => {
            if (onAudioStatusChange) {
              onAudioStatusChange(!!data.audio);
            }
          });
        }
      }
    };

    return (
      <div className="min-h-[200px] relative max-w-[964px] m-[0_auto] aspect-[1.593]">
        <VideoOverlay loading={isBufferingVideo} error={videoError} />
        <ReactPlayer
          ref={this.videoPlayer}
          url={src}
          playsinline
          muted={isMuted}
          width="100%"
          height="100%"
          playing={Boolean(currentRoute && desiredPlaySpeed)}
          onReady={onPlayerReady}
          config={{
            hlsVersion: '1.4.8',
            hlsOptions: {
              maxBufferLength: 40,
            },
          }}
          playbackRate={Math.min((isFirefox() && !isMuted) ? 8 : 16, desiredPlaySpeed || 1)}
          onBuffer={this.onVideoBuffering}
          onBufferEnd={this.onVideoResume}
          onPlay={this.onVideoResume}
          onError={this.onVideoError}
        />
      </div>
    );
  }
}

const stateToProps = (state) => ({
  desiredPlaySpeed: state.desiredPlaySpeed,
  offset: state.offset,
  loop: state.loop,
  isBufferingVideo: state.isBufferingVideo,
  currentRoute: state.currentRoute,
});

export default connect(stateToProps)(DriveVideo);
