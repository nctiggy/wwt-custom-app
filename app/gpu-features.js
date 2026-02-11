/**
 * GPU Feature Detection + Camera Panel + Inference Counter
 * Included in both v1 and v2 — silently degrades when no GPU backend is reachable.
 */
(function () {
  'use strict';

  var GPU_PORT = 30081;
  var GPU_API = 'http://' + window.location.hostname + ':' + GPU_PORT;
  var POLL_INTERVAL = 5000;
  var DETECT_INTERVAL = 300; // ~3 FPS
  var gpuActive = false;
  var totalInferences = 0;
  var detectTimer = null;
  var gpuContainer = null;

  // Class colors for bounding boxes
  var CLASS_COLORS = {
    vehicle: '#006dc7',
    person: '#16a34a',
    fuel_truck: '#fb550e'
  };

  /* ─── GPU Health Polling ─── */
  function checkGPU() {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 3000);

    fetch(GPU_API + '/api/health', { signal: controller.signal })
      .then(function (res) {
        clearTimeout(timeout);
        if (res.ok) return res.json();
        throw new Error('not ok');
      })
      .then(function () {
        if (!gpuActive) enableGPU();
      })
      .catch(function () {
        clearTimeout(timeout);
        if (gpuActive) disableGPU();
      });
  }

  /* ─── Enable GPU Features ─── */
  function enableGPU() {
    gpuActive = true;
    injectGPUPanel();
    startDetectionLoop();
  }

  function disableGPU() {
    gpuActive = false;
    if (detectTimer) { clearInterval(detectTimer); detectTimer = null; }
    var el = document.getElementById('gpu-feature-panel');
    if (el) {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.5s ease';
      setTimeout(function () { el.remove(); }, 500);
    }
    var badge = document.getElementById('gpu-badge');
    if (badge) badge.remove();
    gpuContainer = null;
  }

  /* ─── Inject GPU Panel into Analytics ─── */
  function injectGPUPanel() {
    // Badge in header
    if (!document.getElementById('gpu-badge')) {
      var headerRight = document.querySelector('.header-right');
      if (headerRight) {
        var badge = document.createElement('span');
        badge.id = 'gpu-badge';
        badge.className = 'gpu-badge-pill';
        badge.textContent = 'GPU Accelerated';
        headerRight.insertBefore(badge, headerRight.firstChild);
      }
    }

    // Panel in analytics column
    if (document.getElementById('gpu-feature-panel')) return;

    var panel = document.getElementById('gpu-feature-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'gpu-feature-panel';
      panel.innerHTML =
        '<div class="gpu-camera-card">' +
          '<div class="gpu-camera-title">' +
            '<span class="gpu-camera-dot"></span>' +
            'Security Camera — Pump Area' +
          '</div>' +
          '<div class="gpu-camera-wrap">' +
            '<canvas id="gpu-camera-canvas" width="640" height="400"></canvas>' +
          '</div>' +
          '<div class="gpu-inference-stats">' +
            '<span class="gpu-counter" id="gpu-counter">0</span>' +
            '<span class="gpu-counter-label"> inferences processed</span>' +
          '</div>' +
          '<div class="gpu-powered">Powered by NVIDIA A2000 GPU</div>' +
        '</div>';

      var analytics = document.querySelector('.analytics-panel');
      if (analytics) {
        // Insert after panel-title
        var title = analytics.querySelector('.panel-title');
        if (title && title.nextSibling) {
          analytics.insertBefore(panel, title.nextSibling);
        } else {
          analytics.prepend(panel);
        }
      }

      // Fade in
      panel.style.opacity = '0';
      panel.style.transition = 'opacity 0.5s ease';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { panel.style.opacity = '1'; });
      });
    }

    gpuContainer = document.getElementById('gpu-camera-canvas');
    drawScene(gpuContainer);
  }

  /* ─── Draw Static Scene on Canvas ─── */
  function drawScene(canvas) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;

    // Dark background (security camera look)
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, h * 0.65, w, h * 0.35);

    // Lane markings
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.setLineDash([20, 15]);
    ctx.lineWidth = 2;
    for (var i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.65 + (h * 0.35 / 4) * i);
      ctx.lineTo(w, h * 0.65 + (h * 0.35 / 4) * i);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Pump islands (simple rectangles)
    ctx.fillStyle = '#3a3a5e';
    ctx.fillRect(100, h * 0.55, 80, 12);
    ctx.fillRect(280, h * 0.55, 80, 12);
    ctx.fillRect(460, h * 0.55, 80, 12);

    // Canopy pillars
    ctx.fillStyle = '#4a4a6e';
    for (var p = 0; p < 4; p++) {
      ctx.fillRect(60 + p * 160, h * 0.35, 6, h * 0.2);
    }

    // Store building
    ctx.fillStyle = '#2d2d4e';
    ctx.fillRect(20, 30, 160, 100);
    ctx.fillStyle = 'rgba(0, 109, 199, 0.3)';
    ctx.fillRect(40, 60, 50, 40);
    ctx.fillRect(110, 60, 50, 40);

    // Static vehicles (simple shapes)
    drawVehicle(ctx, 130, h * 0.68, '#4488cc');
    drawVehicle(ctx, 310, h * 0.72, '#cc6644');
    drawVehicle(ctx, 490, h * 0.68, '#66aa66');

    // People (simple circles + line)
    drawPerson(ctx, 70, h * 0.62);
    drawPerson(ctx, 380, h * 0.75);

    // Camera overlay text
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px monospace';
    ctx.fillText('CAM-01  PUMP AREA', 10, 18);
    ctx.fillText(new Date().toLocaleTimeString(), w - 80, 18);

    // Scanline effect
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (var s = 0; s < h; s += 4) {
      ctx.fillRect(0, s, w, 1);
    }
  }

  function drawVehicle(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, 60, 35, 6);
    ctx.fill();
    // Windshield
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 8, y + 4, 44, 10);
  }

  function drawPerson(ctx, x, y) {
    ctx.fillStyle = '#aaaacc';
    ctx.beginPath();
    ctx.arc(x, y - 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 3, y - 3, 6, 14);
  }

  /* ─── Draw Bounding Boxes ─── */
  function drawDetections(detections) {
    if (!gpuContainer) return;
    var ctx = gpuContainer.getContext('2d');

    // Redraw scene first
    drawScene(gpuContainer);

    // Draw boxes
    detections.forEach(function (d) {
      var color = CLASS_COLORS[d.class] || '#ffffff';
      var bx = d.bbox[0], by = d.bbox[1], bw = d.bbox[2], bh = d.bbox[3];

      // Box outline
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);

      // Corner accents
      var corner = 10;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx, by + corner); ctx.lineTo(bx, by); ctx.lineTo(bx + corner, by);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + bw - corner, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + corner);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, by + bh - corner); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + corner, by + bh);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + bw - corner, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - corner);
      ctx.stroke();

      // Label background
      var label = d.class + ' ' + (d.confidence * 100).toFixed(0) + '%';
      ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
      var tw = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillRect(bx, by - 20, tw + 10, 18);

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, bx + 5, by - 6);
    });

    // Timestamp overlay
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px monospace';
    ctx.fillText(new Date().toLocaleTimeString(), gpuContainer.width - 80, 18);
  }

  /* ─── Detection Loop ─── */
  function startDetectionLoop() {
    if (detectTimer) return;
    detectTimer = setInterval(function () {
      if (!gpuActive) return;

      fetch(GPU_API + '/api/detect')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.detections) {
            drawDetections(data.detections);
            totalInferences += data.detections.length;
            var counter = document.getElementById('gpu-counter');
            if (counter) counter.textContent = totalInferences.toLocaleString();
          }
        })
        .catch(function () { /* silent */ });
    }, DETECT_INTERVAL);
  }

  /* ─── Inject Styles ─── */
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent =
      '.gpu-badge-pill {' +
        'font-size: 0.6875rem;' +
        'font-weight: 600;' +
        'padding: 0.25rem 0.75rem;' +
        'border-radius: 9999px;' +
        'letter-spacing: 0.03em;' +
        'background: rgba(22, 163, 74, 0.15);' +
        'color: #16a34a;' +
        'border: 1px solid rgba(22, 163, 74, 0.3);' +
        'animation: gpu-pulse 2s ease-in-out infinite;' +
      '}' +
      '@keyframes gpu-pulse {' +
        '0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }' +
        '50% { box-shadow: 0 0 12px 3px rgba(22, 163, 74, 0.25); }' +
      '}' +
      '.gpu-camera-card {' +
        'background: rgba(29, 30, 72, 0.5);' +
        'border: 1px solid rgba(255, 255, 255, 0.08);' +
        'border-radius: 0.5rem;' +
        'padding: 0.625rem;' +
        'margin-bottom: 0.5rem;' +
      '}' +
      '.gpu-camera-title {' +
        'font-size: 0.625rem;' +
        'font-weight: 600;' +
        'text-transform: uppercase;' +
        'letter-spacing: 0.05em;' +
        'color: rgba(255,255,255,0.6);' +
        'margin-bottom: 0.5rem;' +
        'display: flex;' +
        'align-items: center;' +
        'gap: 0.375rem;' +
      '}' +
      '.gpu-camera-dot {' +
        'width: 6px;' +
        'height: 6px;' +
        'border-radius: 50%;' +
        'background: #ef4444;' +
        'animation: gpu-rec-blink 1s ease-in-out infinite;' +
      '}' +
      '@keyframes gpu-rec-blink {' +
        '0%, 100% { opacity: 1; }' +
        '50% { opacity: 0.3; }' +
      '}' +
      '.gpu-camera-wrap {' +
        'border-radius: 0.375rem;' +
        'overflow: hidden;' +
        'line-height: 0;' +
      '}' +
      '.gpu-camera-wrap canvas {' +
        'width: 100%;' +
        'height: auto;' +
        'display: block;' +
      '}' +
      '.gpu-inference-stats {' +
        'margin-top: 0.5rem;' +
        'text-align: center;' +
      '}' +
      '.gpu-counter {' +
        'font-size: 1.5rem;' +
        'font-weight: 700;' +
        'color: #16a34a;' +
        'font-variant-numeric: tabular-nums;' +
      '}' +
      '.gpu-counter-label {' +
        'font-size: 0.75rem;' +
        'color: rgba(255,255,255,0.5);' +
      '}' +
      '.gpu-powered {' +
        'text-align: center;' +
        'font-size: 0.5625rem;' +
        'font-weight: 500;' +
        'text-transform: uppercase;' +
        'letter-spacing: 0.06em;' +
        'color: rgba(255,255,255,0.3);' +
        'margin-top: 0.25rem;' +
      '}';
    document.head.appendChild(style);
  }

  /* ─── Init ─── */
  injectStyles();
  checkGPU();
  setInterval(checkGPU, POLL_INTERVAL);
})();
