const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d');
const API_BASE_URL = String(window.WEATHER_AGENT_API_BASE_URL || '').replace(/\/+$/, '');
let w = 0, h = 0, scene = 'sunny';

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  w = canvas.width = Math.floor(window.innerWidth * ratio);
  h = canvas.height = Math.floor(window.innerHeight * ratio);
  drawInkBackdrop();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function setSceneFromText(text) {
  if (/雷|thunder/i.test(text)) scene = 'storm';
  else if (/雨|rain/i.test(text)) scene = 'rain';
  else if (/热|高温|炎|晴|sunny/i.test(text)) scene = 'hot';
  else if (/云|cloud/i.test(text)) scene = 'cloud';
  else scene = 'sunny';
  drawInkBackdrop();
}

function drawInkMountain(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0] * w, h);
  points.forEach(([x, y]) => ctx.lineTo(x * w, y * h));
  ctx.lineTo(points[points.length - 1][0] * w, h);
  ctx.closePath();
  ctx.fill();
}

function drawInkBackdrop() {
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, 'rgba(247,243,233,0.28)');
  wash.addColorStop(1, scene === 'rain' || scene === 'storm' ? 'rgba(58,90,88,0.16)' : 'rgba(200,60,60,0.07)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  drawInkMountain([[0, 0.78], [0.16, 0.56], [0.31, 0.72], [0.48, 0.48], [0.65, 0.7], [0.82, 0.52], [1, 0.76]], 'rgba(44,44,44,0.13)');
  drawInkMountain([[0, 0.88], [0.12, 0.72], [0.3, 0.84], [0.44, 0.66], [0.63, 0.82], [0.76, 0.64], [1, 0.86]], 'rgba(58,90,88,0.13)');
  ctx.fillStyle = scene === 'hot' ? 'rgba(200,60,60,0.08)' : 'rgba(44,44,44,0.08)';
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.18, Math.min(w, h) * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

const $ = id => document.getElementById(id);
const question = $('question');
const ask = $('ask');
const clear = $('clear');
const copy = $('copy');
const favorite = $('favorite');
const answer = $('answer');
const progressBar = $('progressBar');
const percent = $('percent');
const stepText = $('stepText');
const city = $('city');
const days = $('days');
const mode = $('mode');
const raw = $('raw');
const intentHint = $('intentHint');
const historyBox = $('history');
const favoritesBox = $('favorites');
const toast = $('toast');
const steps = ['理解问题', '选择能力', '调用工具或模型', '生成回答'];
let progressTimer = null;
let lastAnswer = '';
let lastData = null;

function apiUrl(path) {
  return API_BASE_URL ? API_BASE_URL + path : path;
}

function runningOnGithubPagesWithoutBackend() {
  return !API_BASE_URL && /\.github\.io$/i.test(window.location.hostname);
}

function fetchApi(path, options) {
  if (runningOnGithubPagesWithoutBackend()) {
    return Promise.reject(new Error('GitHub Pages 只能托管静态页面，请先在 static/config.js 配置公开后端 API 地址。'));
  }
  return fetch(apiUrl(path), options);
}

function inferIntent(text) {
  if (!/天气|气温|温度|下雨|降雨|雨|晴|多云|阴天|预报|冷不冷|热不热|穿什么|适合出门|适合去|景点|旅游|旅行|游玩|去哪|哪里玩|路线|攻略/.test(text)) return '通用 AI';
  if (/景点|旅游|旅行|游玩|去哪|哪里玩|路线|攻略/.test(text)) return '天气 + 旅行推荐';
  if (/未来|[1-3]\s*天|明天|预报/.test(text)) return '多天天气';
  return '实时天气';
}

function refreshIntent() {
  intentHint.textContent = inferIntent(question.value);
}

function setProgress(value, labelIndex) {
  const pct = Math.max(0, Math.min(100, value));
  progressBar.style.width = pct + '%';
  percent.textContent = Math.round(pct) + '%';
  const idx = Math.min(3, Math.max(0, labelIndex));
  stepText.textContent = steps[idx];
  for (let i = 0; i < 4; i++) $('s' + i).classList.toggle('active', i <= idx);
}

function startProgress() {
  let value = 8;
  setProgress(value, 0);
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    value = Math.min(92, value + 7 + Math.random() * 8);
    setProgress(value, value < 30 ? 0 : value < 58 ? 1 : value < 82 ? 2 : 3);
  }, 520);
}

function stopProgress(ok) {
  clearInterval(progressTimer);
  setProgress(ok ? 100 : 0, ok ? 3 : 0);
  stepText.textContent = ok ? '完成' : '查询失败';
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}

async function loadHistory() {
  try {
    const res = await fetchApi('/api/history?limit=12');
    if (!res.ok) throw new Error('历史读取失败');
    renderHistory(await res.json());
  } catch {
    renderHistory([]);
  }
}

async function loadFavorites() {
  try {
    const res = await fetchApi('/api/favorites?limit=12');
    if (!res.ok) throw new Error('收藏读取失败');
    renderFavorites(await res.json());
  } catch {
    renderFavorites([]);
  }
}

function renderHistory(list) {
  historyBox.innerHTML = '';
  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'lead';
    empty.textContent = '暂无服务端历史。';
    historyBox.appendChild(empty);
    return;
  }
  list.forEach(item => {
    const btn = document.createElement('button');
    btn.textContent = item.question;
    btn.title = item.answer;
    btn.addEventListener('click', () => {
      question.value = item.question;
      refreshIntent();
      showStoredResult(item);
    });
    historyBox.appendChild(btn);
  });
}

function renderFavorites(list) {
  favoritesBox.innerHTML = '';
  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'lead';
    empty.textContent = '暂无收藏。';
    favoritesBox.appendChild(empty);
    return;
  }
  list.forEach(item => {
    const btn = document.createElement('button');
    btn.textContent = item.question;
    btn.title = item.answer;
    btn.addEventListener('click', () => {
      question.value = item.question;
      refreshIntent();
      showStoredResult(item);
    });
    favoritesBox.appendChild(btn);
  });
}

function showStoredResult(item) {
  stopProgress(true);
  answer.classList.remove('loading');
  answer.textContent = item.answer || '无回答。';
  lastAnswer = item.answer || '';
  lastData = item;
  city.textContent = item.city || '-';
  days.textContent = item.days ? item.days + '天' : '-';
  mode.textContent = taskTypeLabel(item);
  raw.textContent = [
    item.weather ? '天气数据：\n' + item.weather : '',
    item.attraction ? '\n景点依据：\n' + item.attraction : ''
  ].filter(Boolean).join('\n') || '本次没有工具原始数据。';
  analyzeWeather(item);
  setSceneFromText((item.weather || '') + (item.answer || ''));
}

function firstNumber(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

function setDial(id, value) {
  $(id).style.width = Math.max(6, Math.min(100, value)) + '%';
}

function resetSmartCards() {
  $('comfortText').textContent = '等待数据';
  $('heatText').textContent = '等待数据';
  $('rainText').textContent = '等待数据';
  $('tripText').textContent = '等待数据';
  setDial('comfortDial', 18);
  setDial('heatDial', 18);
  setDial('rainDial', 18);
  setDial('tripDial', 18);
  $('timeline').innerHTML = '<div><b>时间线</b><span>查询后展示逐日天气或当前天气摘要。</span></div>';
  $('planner').innerHTML = [
    '<div><b>穿着</b><span>等待天气数据。</span></div>',
    '<div><b>携带</b><span>等待天气数据。</span></div>',
    '<div><b>时间</b><span>等待天气数据。</span></div>'
  ].join('');
}

function taskTypeLabel(data) {
  if (data.task_type) return data.task_type;
  return data.include_attraction ? '天气 + 旅行' : '天气';
}

function showGeneralCards() {
  $('comfortText').textContent = '不适用';
  $('heatText').textContent = '不适用';
  $('rainText').textContent = '不适用';
  $('tripText').textContent = '通用问答';
  setDial('comfortDial', 8);
  setDial('heatDial', 8);
  setDial('rainDial', 8);
  setDial('tripDial', 72);
  $('timeline').innerHTML = '<div><b>类型</b><span>本次为普通 AI 问答，不调用天气工具。</span></div>';
  $('planner').innerHTML = [
    '<div><b>能力</b><span>写作、解释、代码、学习计划等。</span></div>',
    '<div><b>数据</b><span>不包含实时天气或搜索数据。</span></div>',
    '<div><b>提示</b><span>需要实时信息时请明确说明城市、天气或旅行需求。</span></div>'
  ].join('');
}

function analyzeWeather(data) {
  const weather = data.weather || '';
  if (!weather) {
    showGeneralCards();
    return;
  }
  const all = weather + '\n' + (data.answer || '');
  const temp = firstNumber(all, [/体感温度(\d+)/, /气温(\d+)/, /平均(\d+)/, /(\d+)-\d+摄氏度/]);
  const hasRain = /雨|rain/i.test(all);
  const hasThunder = /雷|thunder/i.test(all);
  const hasCloud = /云|cloud/i.test(all);
  const hot = temp !== null && temp >= 32;
  const warm = temp !== null && temp >= 28;
  const comfort = hot ? 38 : warm ? 58 : hasRain ? 64 : 82;
  const heat = hot ? 88 : warm ? 62 : 28;
  const rain = hasThunder ? 86 : hasRain ? 68 : hasCloud ? 28 : 14;
  const trip = data.include_attraction ? (hasThunder ? 42 : hasRain ? 56 : hot ? 66 : 84) : (hasThunder ? 46 : hasRain ? 60 : 78);

  $('comfortText').textContent = comfort >= 75 ? '较舒适' : comfort >= 55 ? '一般' : '偏不适';
  $('heatText').textContent = hot ? '高温明显' : warm ? '偏热' : '温和';
  $('rainText').textContent = hasThunder ? '雷暴风险' : hasRain ? '可能有雨' : '较低';
  $('tripText').textContent = data.include_attraction ? (trip >= 75 ? '适合户外' : '建议轻量出行') : '未请求景点';
  setDial('comfortDial', comfort);
  setDial('heatDial', heat);
  setDial('rainDial', rain);
  setDial('tripDial', trip);

  const lines = weather.split('\n').filter(Boolean);
  const timeline = $('timeline');
  timeline.innerHTML = '';
  if (lines.length > 1) {
    lines.slice(1).forEach(line => {
      const parts = line.split(':');
      const item = document.createElement('div');
      item.innerHTML = `<b>${parts[0] || '天气'}</b><span>${parts.slice(1).join(':') || line}</span>`;
      timeline.appendChild(item);
    });
  } else {
    const item = document.createElement('div');
    item.innerHTML = `<b>当前</b><span>${weather || '暂无天气数据'}</span>`;
    timeline.appendChild(item);
  }

  const wear = hot ? '透气短袖、遮阳帽，避免厚重衣物。' : hasRain ? '轻便外套，鞋子尽量防滑。' : '舒适日常穿搭即可。';
  const carry = hasThunder ? '雨伞、充电宝，减少空旷地停留。' : hasRain ? '雨具、防水袋，保留室内备选。' : hot ? '水、防晒、纸巾，必要时带清凉用品。' : '水和常用证件即可。';
  const timing = hot ? '避开正午，优先上午或傍晚。' : hasRain ? '留意临近预报，选择雨小的窗口。' : '全天安排都相对灵活。';
  $('planner').innerHTML = [
    `<div><b>穿着</b><span>${wear}</span></div>`,
    `<div><b>携带</b><span>${carry}</span></div>`,
    `<div><b>时间</b><span>${timing}</span></div>`
  ].join('');
}

async function submit() {
  const q = question.value.trim();
  if (!q) return;
  ask.disabled = true;
  answer.classList.add('loading');
  answer.textContent = '正在分析问题并生成回答...';
  city.textContent = '-';
  days.textContent = '-';
  mode.textContent = inferIntent(q);
  raw.textContent = '等待数据返回。';
  resetSmartCards();
  startProgress();
  try {
    const res = await fetchApi('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ question: q })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || '请求失败');
    stopProgress(true);
    answer.classList.remove('loading');
    answer.textContent = data.answer || '无回答。';
    lastAnswer = data.answer || '';
    lastData = { ...data, question: q };
    city.textContent = data.city || '-';
    days.textContent = data.days ? data.days + '天' : '-';
    mode.textContent = taskTypeLabel(data);
    raw.textContent = [
      data.weather ? '天气数据：\n' + data.weather : '',
      data.attraction ? '\n景点依据：\n' + data.attraction : ''
    ].filter(Boolean).join('\n') || '本次没有工具原始数据。';
    analyzeWeather(data);
    setSceneFromText((data.weather || '') + (data.answer || ''));
    loadHistory();
  } catch (err) {
    stopProgress(false);
    answer.classList.remove('loading');
    answer.textContent = err.message;
    lastAnswer = '';
    lastData = null;
    setSceneFromText('rain');
  } finally {
    ask.disabled = false;
  }
}

ask.addEventListener('click', submit);
clear.addEventListener('click', () => {
  question.value = '';
  refreshIntent();
  question.focus();
});
copy.addEventListener('click', async () => {
  if (!lastAnswer) return showToast('暂无可复制结果');
  try {
    await navigator.clipboard.writeText(lastAnswer);
    showToast('结果已复制');
  } catch {
    showToast('复制失败');
  }
});
favorite.addEventListener('click', async () => {
  if (!lastData || !lastAnswer) return showToast('暂无可收藏结果');
  try {
    const res = await fetchApi('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(lastData)
    });
    if (!res.ok) throw new Error('收藏失败');
    showToast('已收藏到服务端');
    loadFavorites();
  } catch {
    showToast('收藏失败');
  }
});
question.addEventListener('input', refreshIntent);
question.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && !ev.shiftKey) {
    ev.preventDefault();
    submit();
  }
});
document.querySelectorAll('.chips button').forEach(btn => {
  btn.addEventListener('click', () => {
    question.value = btn.textContent;
    refreshIntent();
    submit();
  });
});
$('clearHistory').addEventListener('click', () => {
  fetchApi('/api/history', { method: 'DELETE' })
    .then(() => loadHistory())
    .catch(() => showToast('清除失败'));
});
refreshIntent();
loadHistory();
loadFavorites();
