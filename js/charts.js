/* IVA v2 — hand-rolled animated SVG chart engine (zero dependencies) */
"use strict";

const Charts = {
  NS: 'xmlns="http://www.w3.org/2000/svg"',

  /* small inline sparkline */
  sparkline(vals, { w = 130, h = 38, color = "var(--brand)", fill = true, id = "" } = {}) {
    const clean = (vals || []).map(v => (Number.isFinite(v) ? v : 0));
    if (!clean.length) clean.push(0, 0);
    const min = Math.min(...clean), max = Math.max(...clean);
    const span = max - min || 1;
    const step = clean.length > 1 ? w / (clean.length - 1) : w;
    const pts = clean.map((v, i) => [i * step, h - 4 - ((v - min) / span) * (h - 8)]);
    const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = path + " L " + w + " " + h + " L 0 " + h + " Z";
    const uid = "sp" + (id || Math.random().toString(36).slice(2, 7));
    return '<svg class="spark" ' + Charts.NS + ' width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      (fill ? '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".28"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
        '<path class="spark-area" d="' + area + '" fill="url(#' + uid + ')"/>' : "") +
      '<path class="spark-line" d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>";
  },

  /* grouped income/expense bars with grid + hover tooltips */
  bars({ labels, income, expense, h = 210, max }, opts = {}) {
    const W = 640, padT = 14, padB = 30, padS = 8;
    const n = Math.max(labels.length, 1);
    const hi = max || Math.max(1, ...income, ...expense);
    const inner = h - padT - padB;
    const slot = W / n;
    const bw = Math.min(26, slot * 0.26);
    const y = v => padT + inner - (v / hi) * inner;
    const gridLines = [0.25, 0.5, 0.75, 1].map(f =>
      '<line x1="0" x2="' + W + '" y1="' + (padT + inner - f * inner).toFixed(1) + '" y2="' + (padT + inner - f * inner).toFixed(1) + '" class="c-grid"/>').join("");
    let out = "";
    labels.forEach((lb, i) => {
      const cx = slot * i + slot / 2;
      const inc = income[i] || 0, exp = expense[i] || 0;
      const x1 = cx - bw - 2, x2 = cx + 2;
      const tip = "<b>" + U.esc(lb) + "</b><br>" + U.icon("in", 12) + " " + U.t("chart.income") + ": " + U.money(inc) + "<br>" + U.icon("out", 12) + " " + U.t("chart.expense") + ": " + U.money(exp);
      out += '<g class="c-bar-g" data-tip="' + U.esc(tip) + '" tabindex="0" role="img" aria-label="' + U.esc(lb) + '">' +
        '<rect class="c-hit" x="' + (slot * i + 2) + '" y="' + padT + '" width="' + (slot - 4) + '" height="' + inner + '" fill="transparent"/>' +
        '<rect class="c-bar c-bar-in" style="--h:' + ((inc / hi) * inner).toFixed(1) + 'px" x="' + x1.toFixed(1) + '" width="' + bw.toFixed(1) + '" y="' + y(inc).toFixed(1) + '" height="' + Math.max(inc > 0 ? 3 : 0, inner - (y(inc) - padT)).toFixed(1) + '" rx="4"/>' +
        '<rect class="c-bar c-bar-out" style="--h:' + ((exp / hi) * inner).toFixed(1) + 'px" x="' + x2.toFixed(1) + '" width="' + bw.toFixed(1) + '" y="' + y(exp).toFixed(1) + '" height="' + Math.max(exp > 0 ? 3 : 0, inner - (y(exp) - padT)).toFixed(1) + '" rx="4"/>' +
        '<text class="c-lb" x="' + cx.toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle">' + U.esc(lb) + "</text></g>";
    });
    return '<svg class="chart chart-bars" ' + Charts.NS + ' viewBox="0 0 ' + W + " " + h + '" preserveAspectRatio="xMidYMid meet" role="img">' + gridLines + '<line x1="0" x2="' + W + '" y1="' + (padT + inner) + '" y2="' + (padT + inner) + '" class="c-axis"/>' + out + "</svg>";
  },

  /* smooth line chart (cumulative) with area + dots */
  line({ labels, values, h = 210, color = "var(--brand)" }, opts = {}) {
    const W = 640, padT = 16, padB = 30, padS = 10;
    /* defensive: ورودی خالی نباید کرش کند (یافته تست واحد) */
    if (!Array.isArray(values) || !values.length) values = [0];
    if (!Array.isArray(labels) || !labels.length) labels = [""];
    const n = Math.max(values.length, 1);
    const inner = h - padT - padB;
    const min = Math.min(0, ...values), max = Math.max(1, ...values);
    const span = max - min || 1;
    const slot = (W - padS * 2) / Math.max(n - 1, 1);
    const pts = values.map((v, i) => [padS + i * slot, padT + inner - ((v - min) / span) * inner]);
    let d = "";
    pts.forEach((p, i) => {
      if (!i) { d += "M" + p[0].toFixed(1) + " " + p[1].toFixed(1); return; }
      const prv = pts[i - 1];
      const cx = (prv[0] + p[0]) / 2;
      d += " C" + cx.toFixed(1) + " " + prv[1].toFixed(1) + " " + cx.toFixed(1) + " " + p[1].toFixed(1) + " " + p[0].toFixed(1) + " " + p[1].toFixed(1);
    });
    const area = d + " L " + pts[pts.length - 1][0].toFixed(1) + " " + (padT + inner) + " L " + pts[0][0].toFixed(1) + " " + (padT + inner) + " Z";
    const uid = "ln" + Math.random().toString(36).slice(2, 7);
    const grid = [0, 0.5, 1].map(f => '<line x1="0" x2="' + W + '" y1="' + (padT + inner - f * inner).toFixed(1) + '" y2="' + (padT + inner - f * inner).toFixed(1) + '" class="c-grid"/>').join("");
    const dots = pts.map((p, i) => '<g class="c-dot-g" data-tip="<b>' + U.esc(labels[i] || "") + "</b><br>" + U.t("chart.net") + ": " + U.money(values[i]) + '"><circle class="c-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="14" fill="transparent"/><circle class="c-pt" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4.5"/></g>').join("");
    const lbs = labels.map((lb, i) => pts[i][0] > 12 && pts[i][0] < W - 30 ? '<text class="c-lb" x="' + pts[i][0].toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle">' + U.esc(lb) + "</text>" : "").join("");
    return '<svg class="chart chart-line" ' + Charts.NS + ' viewBox="0 0 ' + W + " " + h + '" preserveAspectRatio="xMidYMid meet" role="img"><defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".3"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' + grid + '<path class="ln-area" d="' + area + '" fill="url(#' + uid + ')"/><path class="ln-line" d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2.6" stroke-linecap="round"/>' + dots + lbs + "</svg>";
  },

  /* donut of category shares */
  donut(parts, { size = 190, thickness = 24, centerTitle = "", centerSub = "" } = {}) {
    const total = parts.reduce((a, b) => a + b.value, 0);
    const r = (size - thickness) / 2 - 2;
    const C = 2 * Math.PI * r;
    const cx = size / 2, cy = size / 2;
    let off = 0;
    const segs = parts.map((p, i) => {
      const frac = total > 0 ? p.value / total : 0;
      const len = frac * C;
      const gap = Math.min(3, len * 0.2);
      const seg = '<circle class="c-seg" data-cfg="' + off.toFixed(2) + " " + len.toFixed(2) + " " + gap.toFixed(2) + '" data-tip="<b>' + U.esc(p.label) + "</b><br>" + U.esc(p.tip || U.money(p.value)) + " · " + U.pct(frac * 100) + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + p.color + '" stroke-width="' + thickness + '" stroke-linecap="round" stroke-dasharray="0 ' + C.toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" tabindex="0" role="img" aria-label="' + U.esc(p.label) + '"/>';
      off += len;
      return seg;
    }).join("");
    return '<div class="donut-wrap" style="--sz:' + size + 'px"><svg class="chart chart-donut anim-donut" ' + Charts.NS + ' width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '" role="img"><circle class="c-seg-bg" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--line-2)" stroke-width="' + thickness + '"/>' + segs + "</svg>" +
      '<div class="donut-center"><b>' + U.esc(centerTitle) + "</b><small>" + U.esc(centerSub) + "</small></div></div>";
  },

  /* progress ring */
  ring(pct, { size = 74, thickness = 8, color = "var(--brand)", label = "" } = {}) {
    const r = (size - thickness) / 2 - 1;
    const C = 2 * Math.PI * r;
    const p = U.clamp(pct, 0, 100) / 100;
    return '<div class="ring-wrap" style="--sz:' + size + 'px"><svg class="anim-ring" ' + Charts.NS + ' width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '" data-cfg="' + (p * C).toFixed(2) + " " + C.toFixed(2) + '" role="img" aria-label="' + U.pct(pct) + '"><circle class="ring-bg" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--line-2)" stroke-width="' + thickness + '"/><circle class="ring-fg" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + thickness + '" stroke-linecap="round" stroke-dasharray="0 ' + C.toFixed(2) + '"/></svg>' +
      '<b>' + U.esc(label || U.pct(pct)) + "</b></div>";
  },

  /* animate donut segments & rings after insertion */
  animate(root = document) {
    root.querySelectorAll(".anim-donut").forEach(svg => {
      const first = svg.querySelector(".c-seg");
      if (!first) return;
      const C = 2 * Math.PI * parseFloat(first.getAttribute("r"));
      svg.querySelectorAll(".c-seg").forEach((seg, i) => {
        const [off, len, gap] = seg.dataset.cfg.split(" ").map(Number);
        const val = Math.max(0, len - gap);
        setTimeout(() => {
          seg.style.transition = "stroke-dasharray .8s cubic-bezier(.22,1,.36,1) " + (i * 90) + "ms";
          seg.setAttribute("stroke-dasharray", val.toFixed(2) + " " + (C - val).toFixed(2));
        }, 30);
      });
    });
    root.querySelectorAll(".anim-ring").forEach(svg => {
      const [len, C] = svg.dataset.cfg.split(" ").map(Number);
      const ring = svg.querySelector(".ring-fg");
      setTimeout(() => {
        ring.style.transition = "stroke-dasharray .9s cubic-bezier(.22,1,.36,1)";
        ring.setAttribute("stroke-dasharray", len.toFixed(2) + " " + (C - len).toFixed(2));
      }, 30);
    });
    root.querySelectorAll(".c-bar").forEach((b, i) => {
      const finalH = b.getAttribute("height");
      if (!finalH || +finalH <= 0) return;
      const y0 = parseFloat(b.getAttribute("y"));
      const h0 = parseFloat(finalH);
      b.setAttribute("height", "0");
      b.setAttribute("y", String(y0 + h0));
      setTimeout(() => {
        b.style.transition = "none";
        const t0 = performance.now(), dur = 700, delay = i * 28;
        const tick = now => {
          const k = Math.min(1, Math.max(0, (now - t0 - delay) / dur));
          const eased = 1 - Math.pow(1 - k, 3);
          b.setAttribute("height", (h0 * eased).toFixed(1));
          b.setAttribute("y", (y0 + h0 * (1 - eased)).toFixed(1));
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, 16);
    });
  }
};

window.IVA.charts = Charts;
