const benchmark = (() => {
  const params = new URLSearchParams(location.search);
  const size = params.get("size") === "desktop"
    ? {W: 1280, H: 720, dpr: 1.5}
    : {W: 390, H: 844, dpr: 1.5};
  const scenes = [[0, "海棠渡"], [4, "天河星原"], [9, "不系之舟"]];
  const phases = ["world", "sky", "water", "mirror", "pigments", "ice", "scenery", "travelerReflection"];
  const modes = (params.get("modes") || "canvas,skip-mirror,skip-water").split(",");
  const count = Number(params.get("frames")) || 150;
  const warmup = 40;
  const rounds = Number(params.get("rounds")) || 2;
  let marks = {}, frame = {}, mode = "canvas";
  const percentile = (values, q) => {
    const sorted = [...values].sort((a, b) => a - b);
    return Number(sorted[Math.max(0, Math.ceil(sorted.length * q) - 1)].toFixed(3));
  };
  const start = phase => { marks[phase] = performance.now(); };
  const end = phase => { frame[phase] = performance.now() - marks[phase]; };

  function sample(game, scene, nextMode, capture) {
    mode = nextMode;
    game.scene(scene);
    let index = 0;
    let lastFrame;
    const samples = [];
    return new Promise((resolve, reject) => {
      function tick(now) {
        frame = {};
        const started = performance.now();
        try { game.render(index * (1000 / 60)); }
        catch (error) { reject(error); return; }
        frame.js = performance.now() - started;
        frame.raf = lastFrame === undefined ? 0 : now - lastFrame;
        lastFrame = now;
        if (index++ >= warmup) samples.push(frame);
        if (samples.length < count) requestAnimationFrame(tick);
        else {
          if (capture) capture.src = game.canvas.toDataURL("image/png");
          resolve(samples);
        }
      }
      requestAnimationFrame(tick);
    });
  }
  async function attach(game) {
    const panel=document.createElement("div");
    panel.innerHTML = `<main id="controls" style="position:relative;z-index:10;overflow:auto;height:100vh;background:#171926bb;color:white;padding:24px;font:15px system-ui">
      <h1 style="font:600 28px system-ui;margin:0 0 12px">浮梦之境 · 渲染性能</h1><p id="progress">准备中</p>
      <button id="run">开始测试</button>
      <div id="captures"></div><pre id="results" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>
    </main>`;
    document.body.append(panel);
    const progress = document.getElementById("progress");
    const button = document.getElementById("run");
    const results = document.getElementById("results");
    const captures = document.getElementById("captures");
    await game.ready();
    progress.textContent = `${size.W} × ${size.H} CSS px · DPR ${size.dpr}`;
    button.onclick = async () => {
      button.disabled = true;
      results.textContent = "";
      captures.replaceChildren();
      const rows = [];
      try {
        for (const [scene, name] of scenes) {
          const byMode = Object.fromEntries(modes.map(item => [item, []]));
          for (let round = 0; round < rounds; round++) {
            for (const item of round % 2 ? [...modes].reverse() : modes) {
              progress.textContent = `${name} · ${item} · ${round+1}/${rounds}`;
              let image;
              if (params.has("capture") && round === rounds-1) {
                const figure = document.createElement("figure");
                figure.style.cssText = "display:inline-block;margin:0 12px 12px 0";
                const caption = document.createElement("figcaption");
                const labels = {canvas:"原版", "skip-mirror":"关闭天空倒影", "skip-water":"纯色水面", "skip-reflections":"关闭主要倒影"};
                caption.textContent = `${name} · ${labels[item] ?? item}`;
                image = document.createElement("img");
                image.alt = caption.textContent;
                image.style.cssText = "display:block;max-width:min(42vw,390px);height:auto";
                figure.append(image,caption);
                captures.append(figure);
              }
              byMode[item].push(...await sample(game, scene, item, image));
            }
          }
          for (const [item, records] of Object.entries(byMode)) {
            const timing = {};
            for (const phase of ["js","raf",...phases]) {
              const values = records.map(sample => sample[phase]).filter(Number.isFinite);
              if (values.length) timing[phase] = [percentile(values,.5), percentile(values,.95)];
            }
            rows.push({scene:name, mode:item, samples:records.length, timing});
          }
          results.textContent = JSON.stringify(rows);
        }
        progress.textContent = "测试完成";
      } catch (error) {
        progress.textContent = String(error);
      } finally {
        button.disabled = false;
      }
    };
    if(params.has("run"))button.click();
  }
  return {size, start, end, attach, get skipMirror(){return mode === "skip-mirror" || mode === "skip-reflections";},
    get skipReflections(){return mode === "skip-reflections";},
    get skipWater(){return mode === "skip-water";}};
})();
