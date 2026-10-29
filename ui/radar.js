(function (root) {
  function geometry(growth, bonus = 0, language = 'vi') {
    const order = growth.length === 8 ? [0,1,2,3,4,5,6,7] : [0,1,2,3,6,4,5];
    const labels = growth.length === 8
      ? ['HP','Str','Mag','Skill','Spd','Lck','Def','Res']
      : ['HP','Str/Mag','Skill','Spd','Lck','Def','Res'];
    const rates = growth.map(value => Math.max(0, value + bonus));
    const scale = Math.max(100, Math.ceil(Math.max(...rates) / 20) * 20);
    const point = (index, distance) => [
      360 + Math.sin(index * Math.PI * 2 / order.length) * 210 * distance,
      316 - Math.cos(index * Math.PI * 2 / order.length) * 210 * distance
    ];
    const captions = language === 'vi' ? null : root.COMPANION_THEME.locales?.[language]?.radar;
    if (language !== 'vi' && !captions) throw Error('Unsupported radar language: ' + language);
    return {
      width: 720, height: 740, scale,
      rings: Array.from({length: scale / 20}, (_, index) => {
        const value = (index + 1) * 20;
        return {value, bold: value === 100, points: order.map((_, index) => point(index, value / scale))};
      }),
      spokes: order.map((_, index) => point(index, 1)),
      points: order.map((stat, index) => point(index, rates[stat] / scale)),
      labels: order.map((stat, index) => ({
        position: point(index, 1.31), name: labels[index], value: (growth[stat] + bonus) + '%'
      })),
      footer: captions ? captions.scale.replace('{scale}', scale) : 'Thang chung: 0–' + scale + '%',
      note: captions ? captions.note : 'Vòng đậm: 100% · Mỗi vòng: 20%'
    };
  }

  function rasterScale(value) {
    if (![1, 0.5, 1 / 3, 0.25].includes(value)) throw Error('Unsupported Growth raster scale.');
    return value;
  }

  function svg(growth, bonus, language = 'vi', pixelScale = 1) {
    rasterScale(pixelScale);
    const g = geometry(growth, bonus, language);
    const polygon = points => points.map(point => point.map(n => n.toFixed(2)).join(',')).join(' ');
    let content = '';
    for (const ring of g.rings) content += '<polygon points="' + polygon(ring.points)
      + '" fill="none" stroke="' + (ring.bold ? '#c8d7e1' : '#738fa6')
      + '" stroke-opacity="' + (ring.bold ? '1' : '.48')
      + '" stroke-width="' + (ring.bold ? '3.5' : '1.5') + '"/>';
    for (const [x,y] of g.spokes) content += '<path d="M360 316L' + x + ' ' + y
      + '" stroke="#738fa6" stroke-opacity=".4" stroke-width="1.5"/>';
    content += '<polygon points="' + polygon(g.points)
      + '" fill="#4babe5" fill-opacity=".35" stroke="#f1d58b" stroke-width="4"/>';
    for (const [x,y] of g.points) content += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="#fff0c3"/>';
    for (const label of g.labels) {
      const [x,y] = label.position;
      content += '<text x="' + x + '" y="' + (y - 18)
        + '" font-size="32" font-weight="700" fill="#f4e8c7">' + label.name
        + '</text><text x="' + x + '" y="' + (y + 22)
        + '" font-size="32" font-weight="700" fill="#9fd7f6">' + label.value + '</text>';
    }
    content += '<text x="360" y="686" font-size="28" fill="#c8d7e1">' + g.footer
      + '</text><text x="360" y="716" font-size="20" fill="#c8d7e1">' + g.note + '</text>';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + Math.round(g.width * pixelScale)
      + '" height="' + Math.round(g.height * pixelScale) + '"'
      + (pixelScale === 1 ? '' : ' viewBox="0 0 720 740"')
      + '><g font-family="Inter, sans-serif" text-anchor="middle" dominant-baseline="central">'
      + content + '</g></svg>';
  }

  function draw(canvas, growth, bonus, language = 'vi', pixelScale = 1) {
    rasterScale(pixelScale);
    const g = geometry(growth, bonus, language);
    canvas.width = Math.round(g.width * pixelScale); canvas.height = Math.round(g.height * pixelScale);
    const context = canvas.getContext('2d');
    if (pixelScale !== 1) context.scale(pixelScale, pixelScale);
    function polygon(points) {
      context.beginPath();
      points.forEach(([x,y], index) => index ? context.lineTo(x,y) : context.moveTo(x,y));
      context.closePath();
    }
    for (const ring of g.rings) {
      context.strokeStyle = ring.bold ? '#c8d7e1' : 'rgba(115,143,166,.48)';
      context.lineWidth = ring.bold ? 3.5 : 1.5;
      polygon(ring.points); context.stroke();
    }
    context.strokeStyle = 'rgba(115,143,166,.4)'; context.lineWidth = 1.5;
    for (const [x,y] of g.spokes) {
      context.beginPath(); context.moveTo(360,316); context.lineTo(x,y); context.stroke();
    }
    polygon(g.points); context.fillStyle = 'rgba(75,171,229,.35)'; context.fill();
    context.strokeStyle = '#f1d58b'; context.lineWidth = 4; context.stroke();
    context.fillStyle = '#fff0c3';
    for (const [x,y] of g.points) {
      context.beginPath(); context.arc(x,y,5,0,Math.PI*2); context.fill();
    }
    context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = '700 32px KitInter';
    for (const label of g.labels) {
      const [x,y] = label.position;
      context.fillStyle = '#f4e8c7'; context.fillText(label.name,x,y-18);
      context.fillStyle = '#9fd7f6'; context.fillText(label.value,x,y+22);
    }
    context.fillStyle = '#c8d7e1'; context.font = '400 28px KitInter'; context.fillText(g.footer,360,686);
    context.font = '400 20px KitInter'; context.fillText(g.note,360,716);
  }
  root.CompanionRadar = {geometry, svg, draw};
})(globalThis);
