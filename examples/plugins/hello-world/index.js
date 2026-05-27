// Hello World plugin for RefPlayer.
// Demonstrates a sidebar panel, an overlay drawn over the video,
// and frame-state subscription via the PluginAPI.
//
// The plugin host calls module.exports with the API instance.

module.exports = function register(api) {
  var lastFrame = 0;

  api.registerPanel(function (root) {
    var wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '8px';

    var frameLabel = document.createElement('div');
    frameLabel.style.fontSize = '12px';
    frameLabel.style.color = 'var(--text-secondary)';
    frameLabel.textContent = '現在フレーム: -';
    wrap.appendChild(frameLabel);

    var row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '6px';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'btn-secondary';
    prevBtn.textContent = '◀ 1';
    prevBtn.onclick = function () { api.stepFrame(-1); };

    var nextBtn = document.createElement('button');
    nextBtn.className = 'btn-secondary';
    nextBtn.textContent = '1 ▶';
    nextBtn.onclick = function () { api.stepFrame(1); };

    row.appendChild(prevBtn);
    row.appendChild(nextBtn);
    wrap.appendChild(row);

    root.appendChild(wrap);

    var unsub = api.subscribeFrame(function (frame) {
      lastFrame = frame;
      frameLabel.textContent = '現在フレーム: ' + frame;
      api.requestRedraw();
    });

    return function cleanup() {
      unsub();
    };
  }, { title: 'Hello World', defaultOpen: true });

  api.registerOverlay(function (ctx, state) {
    var w = ctx.canvas.width / (window.devicePixelRatio || 1);
    var text = 'frame ' + state.currentFrame + ' @ ' + state.displayFps + 'fps';

    ctx.save();
    ctx.fillStyle = 'rgba(20, 20, 30, 0.55)';
    ctx.fillRect(12, 12, 220, 38);
    ctx.fillStyle = '#ffd9e6';
    ctx.font = '13px sans-serif';
    ctx.fillText(text, 22, 36);
    ctx.restore();

    // Avoid unused-variable warnings
    void w;
    void lastFrame;
  });
};
