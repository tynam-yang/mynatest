// content/screen-recorder.js — ISOLATED world
// 职责：接收 background 的 streamId，用 MediaRecorder 录屏，完成后发回 blob URL

(function () {
  let mediaRecorder = null;
  let chunks = [];
  let stream = null;
  let startTime = 0;
  let tickTimer = null;

  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function postToSidepanel(type, payload) {
    try {
      chrome.runtime.sendMessage({ type, payload }, () => { void chrome.runtime?.lastError; });
    } catch {}
  }

  async function startRecording(payload) {
    if (mediaRecorder) {
      postToSidepanel('screen-recorder:already-recording');
      return { ok: false, error: '已在录屏中' };
    }

    const { streamId, tabId } = payload;

    try {
      // MV3 方式：用 streamId 获取 MediaStream
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: streamId
          }
        }
      });
    } catch (e) {
      return { ok: false, error: '获取屏幕流失败：' + String(e?.message || e) };
    }

    // 选择可用的 MIME 类型
    const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    let mimeType = '';
    for (const mt of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break; }
    }

    try {
      mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (e) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
      return { ok: false, error: 'MediaRecorder 创建失败：' + String(e?.message || e) };
    }

    chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      // 清理定时器
      if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }

      const duration = Date.now() - startTime;

      // 停止所有轨道
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
      }

      // 合并 chunks → blob → dataUrl
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      chunks = [];

      // 转 dataUrl（大文件可能慢，但 MV3 不能直接用 blob URL + downloads API）
      try {
        const dataUrl = await blobToDataUrl(blob);
        postToSidepanel('screen-recorder:recording-done', {
          dataUrl,
          duration,
          size: blob.size,
          mimeType: blob.type,
          filename: `recording-${Date.now()}.webm`
        });
      } catch (e) {
        postToSidepanel('screen-recorder:recording-done', {
          error: '录屏文件处理失败：' + String(e?.message || e),
          duration,
          size: blob.size
        });
      }

      mediaRecorder = null;
    };

    mediaRecorder.onerror = (e) => {
      postToSidepanel('screen-recorder:error', { error: String(e?.message || e) });
    };

    mediaRecorder.start(1000); // 每秒采集一次 data
    startTime = Date.now();

    // 定时推送时长
    tickTimer = setInterval(() => {
      postToSidepanel('screen-recorder:tick', {
        duration: Date.now() - startTime,
        tabId: tabId
      });
    }, 500);

    postToSidepanel('screen-recorder:started', { tabId });
    return { ok: true, tabId };
  }

  function stopRecording() {
    if (!mediaRecorder) return { ok: false, error: '未在录屏' };
    try {
      mediaRecorder.stop();
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
    return { ok: true };
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.type) return;
    const safeSend = (data) => { try { sendResponse(data); } catch {} };

    if (msg.type === 'screen-recorder:start') {
      startRecording(msg).then(safeSend);
      return true;
    }

    if (msg.type === 'screen-recorder:stop') {
      safeSend(stopRecording());
      return;
    }
  });

  // bfcache 恢复时重注册
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || !msg.type) return;
      const safeSend = (data) => { try { sendResponse(data); } catch {} };
      if (msg.type === 'screen-recorder:start') { startRecording(msg).then(safeSend); return true; }
      if (msg.type === 'screen-recorder:stop') { safeSend(stopRecording()); return; }
    });
  });
})();
