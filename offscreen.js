// offscreen.js — Offscreen Document 中的录屏核心
// 在 Offscreen Document 中运行，拥有完整扩展权限 + DOM 上下文
// 负责：tabCapture.getMediaStreamId → getUserMedia → MediaRecorder → blob

let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let startTime = 0;
let timerInterval = null;

// ===== 计时器 =====
function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    chrome.runtime.sendMessage({ type: 'screen-recorder:tick', payload: { seconds: elapsed } });
  }, 500);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

// ===== 获取 MIME =====
function pickMime() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  for (const m of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'video/webm';
}

// ===== 消息处理 =====
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'offscreen:start-recording') {
        await startRecording(msg.source, msg.streamId, msg.audio);
        sendResponse({ ok: true });
      } else if (msg.type === 'offscreen:stop-recording') {
        await stopRecording();
        sendResponse({ ok: true });
      } else if (msg.type === 'offscreen:status') {
        sendResponse({ ok: true, recording: !!mediaRecorder && mediaRecorder.state === 'recording' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  return true; // keep channel open
});

// streamId 由 Service Worker 获取（tabCapture/desktopCapture API 不存在于 offscreen）
async function startRecording(source, streamId, withAudio) {
  // source: 'tab'（tabCapture 路径）| 'desktop'（desktopCapture 路径）
  const mandatory = source === 'desktop'
    ? { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId }
    : { chromeMediaSource: 'tab', chromeMediaSourceId: streamId };

  const constraints = {
    video: { mandatory },
    audio: withAudio ? { mandatory } : false
  };

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (e) {
    // 带音频失败时降级为仅视频
    if (withAudio) {
      constraints.audio = false;
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    } else {
      throw e;
    }
  }

  // 3) MediaRecorder
  const mime = pickMime();
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(mediaStream, { mimeType: mime });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    stopTimer();
    const blob = new Blob(recordedChunks, { type: mime });
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const size = blob.size;

    // 转 dataUrl（MV3 不能用 blob URL + downloads）
    const reader = new FileReader();
    reader.onloadend = () => {
      chrome.runtime.sendMessage({
        type: 'screen-recorder:recording-done',
        payload: {
          dataUrl: reader.result,
          duration,
          size,
          mime
        }
      });
    };
    reader.readAsDataURL(blob);

    // 清理流
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    mediaRecorder = null;
    recordedChunks = [];
  };

  mediaRecorder.start(1000); // 每秒一个 chunk
  startTimer();

  chrome.runtime.sendMessage({ type: 'screen-recorder:started', payload: {} });
}

async function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  } else {
    stopTimer();
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
  }
}
