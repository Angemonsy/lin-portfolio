(() => {
  const root = document.getElementById('intro-video');
  if (!root) return;
  const video = root.querySelector('video');
  const cover = root.querySelector('.video-cover');
  const controls = root.querySelector('.player-controls');
  const play = root.querySelector('[data-play]');
  const mute = root.querySelector('[data-mute]');
  const fullscreen = root.querySelector('[data-fullscreen]');
  const seek = root.querySelector('[data-seek]');
  const volume = root.querySelector('[data-volume]');
  const time = root.querySelector('[data-time]');
  const status = root.querySelector('[role="status"]');
  const format = value => {
    const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  };
  function update() {
    const duration = Number.isFinite(video.duration) ? video.duration : 224.9;
    time.textContent = format(video.currentTime) + ' / ' + format(Math.ceil(duration));
    if (!seek.matches(':active')) seek.value = duration ? Math.round(video.currentTime / duration * 1000) : 0;
    seek.setAttribute('aria-valuetext', format(video.currentTime) + '，共' + format(duration));
    play.textContent = video.ended ? '重播' : video.paused ? '播放' : '暂停';
    play.setAttribute('aria-label', play.textContent + '视频');
    mute.textContent = video.muted ? '取消静音' : '静音';
    mute.setAttribute('aria-pressed', String(video.muted));
  }
  async function begin() {
    status.textContent = '正在载入视频…';
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    cover.hidden = true;
    video.hidden = false;
    controls.hidden = false;
    try {
      await video.play();
      status.textContent = '';
    } catch {
      cover.hidden = false;
      video.hidden = true;
      controls.hidden = true;
      status.textContent = '视频暂时无法播放，请点击封面重试。';
    }
  }
  cover.addEventListener('click', begin);
  play.addEventListener('click', () => video.paused ? begin() : video.pause());
  video.addEventListener('click', () => video.paused ? begin() : video.pause());
  root.addEventListener('contextmenu', event => event.preventDefault());
  root.addEventListener('dragstart', event => event.preventDefault());
  seek.addEventListener('input', () => {
    if (Number.isFinite(video.duration)) video.currentTime = Number(seek.value) / 1000 * video.duration;
    update();
  });
  mute.addEventListener('click', () => { video.muted = !video.muted; update(); });
  volume.addEventListener('input', () => { video.volume = Number(volume.value); video.muted = video.volume === 0; update(); });
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.requestFullscreen) await root.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    } catch { status.textContent = '当前浏览器不支持全屏，可直接在页面中观看。'; }
  });
  document.addEventListener('fullscreenchange', () => { fullscreen.textContent = document.fullscreenElement ? '退出全屏' : '全屏'; });
  for (const event of ['timeupdate', 'loadedmetadata', 'play', 'pause', 'ended', 'volumechange']) video.addEventListener(event, update);
  video.addEventListener('error', () => { status.textContent = '视频载入失败，请刷新页面后重试。'; });
  update();
})();
