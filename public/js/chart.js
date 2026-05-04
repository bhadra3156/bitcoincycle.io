// "NOW" vertical line plugin
const nowLinePlugin = {
  id: 'nowLine',
  afterDraw(chart) {
    if (nowIdx < 0) return;
    const { ctx: c, chartArea: { top, bottom }, scales: { x } } = chart;
    const x0 = x.getPixelForValue(nowIdx - 1);
    const x1 = x.getPixelForValue(nowIdx);
    const prev = slice[nowIdx - 1];
    const next = slice[nowIdx];
    const frac = prev && next
      ? (now - prev.date) / (next.date - prev.date)
      : 0.5;
    const xPos = x0 + (x1 - x0) * frac;

    c.save();

    // Draw dashed vertical line
    c.beginPath();
    c.setLineDash([4, 3]);
    c.moveTo(xPos, top);
    c.lineTo(xPos, bottom);
    c.strokeStyle = '#38BDF8';
    c.lineWidth = 1.5;
    c.stroke();

    // Draw "NOW" label in the MIDDLE of the line
    c.setLineDash([]);
    const midY = top + (bottom - top) / 2;
    c.font = 'bold 11px "Space Mono", monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const tw = c.measureText('NOW').width;

    // Box background
    c.fillStyle = 'rgba(10,10,10,0.85)';
    c.fillRect(xPos - tw / 2 - 8, midY - 11, tw + 16, 22);

    // Box border
    c.strokeStyle = '#F7931A';
    c.lineWidth = 1;
    c.strokeRect(xPos - tw / 2 - 8, midY - 11, tw + 16, 22);

    // Text
    c.fillStyle = '#F7931A';
    c.fillText('NOW', xPos, midY);

    c.restore();
  }
};
