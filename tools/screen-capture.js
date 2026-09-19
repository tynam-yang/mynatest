// tools/screen-capture.js — 截图 & 录屏（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});

  const meta = {
    id: 'screen-capture',
    name: '截图 & 录屏',
    desc: '可视区域截图 / 全页截图 / 录屏',
    iconUrl: 'icons/screen-capture.png',
    category: 'dev',
    categoryName: '开发工具'
  };

  let currentImageData = null;
  let currentRecordingData = null;
  let isRecording = false;
  let recordedDuration = 0;
  let recordingTick = null;
  let unsubs = [];

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>

      <!-- 截图区 -->
      <div class="sc-section">
        <div class="sc-section-title">📷 截图</div>
        <div class="sc-screenshot-bar">
          <button class="btn sc-btn" id="scVisibleBtn">可见区域截图</button>
          <button class="btn sc-btn sc-btn-primary" id="scFullPageBtn">全页截图</button>
        </div>
        <div id="scShotPreview" class="sc-preview" style="display:none;"></div>
      </div>

      <!-- 录屏区 -->
      <div class="sc-section">
        <div class="sc-section-title">🎬 录屏</div>
        <div class="sc-record-bar">
          <button class="btn sc-btn" id="scStartBtn">● 开始录屏</button>
          <button class="btn sc-btn sc-btn-danger" id="scStopBtn" style="display:none;">■ 停止录屏</button>
          <span class="sc-timer" id="scTimer" style="display:none;">00:00</span>
        </div>
        <div id="scRecordPreview" class="sc-preview" style="display:none;"></div>
        <div class="sc-tip" id="scTip">点击开始录屏后，在弹出的选择框中选中要录制的标签页</div>
      </div>
    `;

    container.querySelector('#scVisibleBtn').addEventListener('click', () => takeShot(container, 'visible'));
    container.querySelector('#scFullPageBtn').addEventListener('click', () => takeShot(container, 'fullpage'));
    container.querySelector('#scStartBtn').addEventListener('click', () => startRecord(container));
    container.querySelector('#scStopBtn').addEventListener('click', () => stopRecord(container));
  }

  function mount(context) {
    const { container, events } = context;
    unsubs = [];
    if (events && typeof events.on === 'function') {
      unsubs.push(events.on('screen-recorder:tick', (payload) => {
        recordedDuration = payload.duration;
        const timer = container.querySelector('#scTimer');
        if (timer) timer.textContent = formatTime(payload.duration);
      }));
      unsubs.push(events.on('screen-recorder:recording-done', (payload) => {
        showRecordingResult(container, payload);
      }));
      unsubs.push(events.on('screen-recorder:started', () => {
        // recording 状态由 startRecord 自身管理
      }));
    }
  }

  function cleanup() {
    unsubs.forEach(fn => { try { fn(); } catch {} });
    unsubs = [];
    if (recordingTick) { clearInterval(recordingTick); recordingTick = null; }
    // 释放录屏预览的 blob URL
    if (currentRecordingData?.url) {
      try { URL.revokeObjectURL(currentRecordingData.url); } catch {}
    }
    currentRecordingData = null;
    // 录制中切走工具页 → 结束录制
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      try { mediaRecorder.stop(); } catch {}
    }
    if (recordStream) {
      recordStream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      recordStream = null;
    }
  }

  function takeShot(container, type) {
    const btn = container.querySelector(type === 'visible' ? '#scVisibleBtn' : '#scFullPageBtn');
    btn.disabled = true;
    btn.textContent = '截图中…';

    const msgType = type === 'visible' ? 'screen-capture:visible' : 'screen-capture:fullpage';
    chrome.runtime.sendMessage({ type: msgType }, (res) => {
      void chrome.runtime?.lastError;
      btn.disabled = false;
      btn.textContent = type === 'visible' ? '可见区域截图' : '全页截图';

      if (chrome.runtime.lastError) {
        flashMessage('截图失败：' + chrome.runtime.lastError.message);
        return;
      }
      if (!res?.ok) {
        flashMessage('截图失败：' + (res?.error || '未知错误'));
        return;
      }

      currentImageData = res.dataUrl;
      showScreenshot(container, res.dataUrl, type);
      flashMessage('✓ 截图完成', 1500);
    });
  }

  function showScreenshot(container, dataUrl, type) {
    const preview = container.querySelector('#scShotPreview');
    preview.style.display = '';
    preview.innerHTML = `
      <div class="sc-preview-header">
        <span>${type === 'fullpage' ? '全页截图' : '可见区域截图'}</span>
        <div class="sc-preview-actions">
          <button class="btn sc-small-btn" id="scSaveImgBtn">💾 保存</button>
          <button class="btn sc-small-btn" id="scCopyImgBtn">📋 复制</button>
        </div>
      </div>
      <img src="${dataUrl}" class="sc-preview-img" />
    `;
    preview.querySelector('#scSaveImgBtn').addEventListener('click', () => {
      saveImage(dataUrl, `screenshot-${Date.now()}.png`);
    });
    preview.querySelector('#scCopyImgBtn').addEventListener('click', () => {
      copyImageToClipboard(dataUrl);
    });
  }

  // ===== 录屏：直接在 sidepanel（扩展页面）中用标准 getDisplayMedia =====
  // 放弃 tabCapture / desktopCapture + offscreen 链路（存在 invoked 授权与流消费限制）
  // 点击按钮即为用户手势，getDisplayMedia 是标准 Web API，必定可用
  let recordStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordStartTime = 0;

  function pickRecorderMime() {
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

  function startRecord(container) {
    const tip = container.querySelector('#scTip');
    tip.textContent = '请在弹出的选择框中选择要录制的标签页…';

    navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: false
    }).then((stream) => {
      recordStream = stream;
      recordedChunks = [];
      const mime = pickRecorderMime();

      mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };
      mediaRecorder.onstop = () => finishRecording(container, mime);

      // 用户点浏览器共享条上的"停止共享"或标签页关闭 → 自动结束并保存
      const track = stream.getVideoTracks()[0];
      if (track) track.addEventListener('ended', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') stopRecord(container);
      });

      mediaRecorder.start(1000);
      recordStartTime = Date.now();

      // UI 进入录制态
      isRecording = true;
      recordedDuration = 0;
      container.querySelector('#scStartBtn').style.display = 'none';
      container.querySelector('#scStopBtn').style.display = '';
      container.querySelector('#scTimer').style.display = '';
      container.querySelector('#scTip').textContent = '⏺ 正在录屏… 点击停止按钮（或浏览器共享条上的"停止共享"）结束';
      flashMessage('🔴 开始录屏', 1500);

      recordingTick = setInterval(() => {
        recordedDuration = Date.now() - recordStartTime;
        const timer = container.querySelector('#scTimer');
        if (timer) timer.textContent = formatTime(recordedDuration);
      }, 500);
    }).catch((e) => {
      if (e?.name === 'NotAllowedError') {
        tip.textContent = '已取消录屏';
      } else {
        flashMessage('录屏启动失败：' + (e?.message || e));
        tip.textContent = '点击开始录屏后，在弹出的选择框中选中要录制的标签页';
      }
    });
  }

  function stopRecord(container) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop(); // onstop → finishRecording
    } else {
      finishRecording(container, pickRecorderMime());
    }
  }

  function finishRecording(container, mime) {
    if (recordingTick) { clearInterval(recordingTick); recordingTick = null; }
    if (recordStream) {
      recordStream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      recordStream = null;
    }

    const duration = Date.now() - recordStartTime;
    const blob = new Blob(recordedChunks, { type: mime });
    recordedChunks = [];
    mediaRecorder = null;
    isRecording = false;

    // UI 复位
    container.querySelector('#scStartBtn').style.display = '';
    container.querySelector('#scStopBtn').style.display = 'none';
    container.querySelector('#scTimer').style.display = 'none';

    if (!blob.size) {
      container.querySelector('#scTip').textContent = '未录制到内容';
      return;
    }

    container.querySelector('#scTip').textContent = '正在生成预览…';

    // 预览用 blob URL（即时可播）；点保存时才转 dataUrl 传给 downloads API
    const url = URL.createObjectURL(blob);
    showRecordingResult(container, {
      url,
      blob,
      duration,
      size: blob.size,
      filename: `recording-${Date.now()}.webm`
    });
  }

  function showRecordingResult(container, payload) {
    const preview = container.querySelector('#scRecordPreview');
    if (payload.error) {
      container.querySelector('#scTip').textContent = '❌ 录屏失败：' + payload.error;
      return;
    }
    currentRecordingData = payload;
    const sizeKB = (payload.size / 1024).toFixed(1);
    const sizeMB = (payload.size / 1048576).toFixed(1);
    const sizeText = payload.size > 1048576 ? sizeMB + ' MB' : sizeKB + ' KB';
    const durText = formatTime(payload.duration || 0);

    container.querySelector('#scTip').textContent = `✓ 录屏完成 · ${durText} · ${sizeText}`;
    preview.style.display = '';
    preview.innerHTML = `
      <div class="sc-preview-header">
        <span>🎬 录屏 · ${durText} · ${sizeText}</span>
        <div class="sc-preview-actions">
          <button class="btn sc-small-btn" id="scSaveVideoBtn">💾 保存</button>
        </div>
      </div>
      <video src="${payload.url}" class="sc-preview-video" controls autoplay muted></video>
    `;
    preview.querySelector('#scSaveVideoBtn').addEventListener('click', () => {
      const tip = container.querySelector('#scTip');
      tip.textContent = '正在保存录屏文件…';
      // 直接用 <a download> 下载 blob，不走 dataUrl 转换（大文件不会被损坏）
      const a = document.createElement('a');
      a.href = URL.createObjectURL(payload.blob);
      a.download = payload.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      tip.textContent = `✓ 录屏完成 · ${durText} · ${sizeText}`;
    });
    flashMessage('✓ 录屏完成', 1500);
  }

  function saveImage(dataUrl, filename) {
    chrome.runtime.sendMessage({ type: 'screen-capture:download', dataUrl, filename });
  }

  async function copyImageToClipboard(dataUrl) {
    try {
      // MV3 sidepanel：clipboard API 需要用户手势，downloads 更可靠
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      flashMessage('✓ 已复制到剪贴板', 1500);
    } catch (e) {
      // 降级：保存为文件
      saveImage(dataUrl, `screenshot-${Date.now()}.png`);
      flashMessage('剪贴板不可用，已改为保存文件', 2000);
    }
  }

  function formatTime(ms) {
    const s = Math.floor((ms || 0) / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  if (!window.MynaTools) window.MynaTools = [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();
