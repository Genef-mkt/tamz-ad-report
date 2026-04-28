Chart.defaults.font.family = "'Pretendard Variable', Pretendard, sans-serif";
Chart.defaults.color = "#64748b"; 
Chart.defaults.font.weight = "500"; 
Chart.defaults.plugins.legend.labels.boxPadding = 8; 
Chart.defaults.plugins.tooltip.backgroundColor = "#1e293b";
Chart.defaults.plugins.tooltip.titleColor = "#f8fafc";
Chart.defaults.plugins.tooltip.bodyColor = "#f1f5f9";
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.usePointStyle = true;
Chart.defaults.plugins.tooltip.titleFont = { size: 12, weight: '600' };
Chart.defaults.plugins.tooltip.bodyFont = { size: 13, weight: '600' };

Chart.defaults.plugins.tooltip.callbacks = Chart.defaults.plugins.tooltip.callbacks || {};
Chart.defaults.plugins.tooltip.callbacks.labelColor = function(context) {
  let color = context.dataset.borderColor || context.dataset.backgroundColor;
  if (context.dataset.type === 'bar' || context.chart.config.type === 'doughnut') {
      color = context.dataset.backgroundColor;
  }
  if (Array.isArray(color)) color = color[context.dataIndex];
  return {
      borderColor: color,
      backgroundColor: color 
  };
};
const defaultGrid = { color: "#f1f5f9", drawBorder: false };

function getReadablePieAggregation(rawDict, otherLabelOverride) {
  if (Object.keys(rawDict).length <= 1) return rawDict;
  const totalSum = Object.values(rawDict).reduce((a, b) => a + b, 0);
  if (totalSum === 0) return rawDict;
  
  const groupedDict = {};
  let otherValueSum = 0;
  const readabilityThreshold = 0.03; 
  
  Object.entries(rawDict).forEach(([k, v]) => {
      if (v / totalSum < readabilityThreshold) {
          otherValueSum += v;
      } else {
          groupedDict[k] = v;
      }
  });
  
  if (otherValueSum > 0) {
      const finalDict = {};
      let finalOtherValue = 0;
      Object.entries(rawDict).forEach(([k,v]) => {
          if (v / totalSum < readabilityThreshold) {
              finalOtherValue += v;
          } else {
              finalDict[k] = v;
          }
      });
      
      if (finalOtherValue > 0) {
          finalDict[otherLabelOverride || "기타 비중"] = finalOtherValue;
      }
      return finalDict;
  }
  return groupedDict;
}

function parseNum(val) {
  if (!val || val === "-") return 0;
  return parseFloat(String(val).replace(/[^0-9.-]/g, "")) || 0;
}
function getLocalYYYYMMDD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function normalizeDateStr(dateStr) {
  if (!dateStr) return "";
  let d = String(dateStr).trim().replace(/\s/g, "").replace(/년|월/g, "-").replace(/일/g, "").replace(/[\.\/]/g, "-").replace(/-$/, "");
  let p = d.split("-");
  if (p.length === 3) return `${p[0].length === 2 ? "20" + p[0] : p[0]}-${p[1].padStart(2, "0")}-${p[2].padStart(2, "0")}`;
  return d;
}
function getDayClass(dateStr) {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  const day = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
  return day === 6 ? "row-saturday" : day === 0 ? "row-sunday" : "";
}

const today = new Date();
const yesterdayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
const YESTERDAY_STR = getLocalYYYYMMDD(yesterdayDate);

const DATA_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR2vuzfX_Ngbu-bU9NzNsiMeWs4YtA-ViB-0OIN0Jy2X2I9WjuQ2KJWwiya2RhOLyN21eo4X1W521kR/pub?gid=0&single=true&output=csv";
const REVENUE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR2vuzfX_Ngbu-bU9NzNsiMeWs4YtA-ViB-0OIN0Jy2X2I9WjuQ2KJWwiya2RhOLyN21eo4X1W521kR/pub?gid=2101973129&single=true&output=csv";
const CONTRACT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR2vuzfX_Ngbu-bU9NzNsiMeWs4YtA-ViB-0OIN0Jy2X2I9WjuQ2KJWwiya2RhOLyN21eo4X1W521kR/pub?gid=1671790998&single=true&output=csv";
const AI_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR2vuzfX_Ngbu-bU9NzNsiMeWs4YtA-ViB-0OIN0Jy2X2I9WjuQ2KJWwiya2RhOLyN21eo4X1W521kR/pub?gid=1973080051&single=true&output=csv";
const VIRAL_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR2vuzfX_Ngbu-bU9NzNsiMeWs4YtA-ViB-0OIN0Jy2X2I9WjuQ2KJWwiya2RhOLyN21eo4X1W521kR/pub?gid=337910119&single=true&output=csv"; 

let masterData = [], currentData = [];
let masterRevenueData = [], currentRevenueData = [];
let masterViralData = [], currentViralData = [];

let platforms = [], currentTab = "DASHBOARD", currentAdFilter = "ALL", currentCategoryFilter = "ALL"; 

let chartInstances = {}, dataMaxDate = yesterdayDate, fpInstance = null;
let aiParsedData = { summary: "데이터를 불러오는 중입니다...", best: "-", worst: "-", insight: "-", action: "-" };
let trendInterval = "week";

const palette = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", 
  "#f43f5e", "#6366f1", "#ec4899", "#84cc16", "#06b6d4", "#f97316"
];

const brandColors = {
  naver: "#10b981", gfa: "#059669", 네이버: "#10b981", meta: "#3b82f6", 메타: "#3b82f6",
  coupang: "#ef4444", 쿠팡: "#ef4444", 구글: "#f59e0b", google: "#f59e0b", kakao: "#eab308", 카카오: "#eab308",
  "파워링크": "#3b82f6", 
  "쇼핑검색": "#10b981", 
  "브랜드검색": "#f59e0b", 
  "앰버서더": "#8b5cf6", 
  "애드부스트": "#f97316", 
  "동영상조회": "#14b8a6", 
  "카탈로그": "#ec4899"  
};

function getConsistentColor(text) {
  const key = String(text).toLowerCase();
  if (brandColors[key]) return brandColors[key]; 
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

const fetchCSV = (url, hasHeader = true) =>
  new Promise((resolve, reject) => {
    Papa.parse(url, { download: true, header: hasHeader, skipEmptyLines: true, complete: resolve, error: reject });
  });

window.onload = async function () {
  try {
    let viralRes = { data: [] };
    if (VIRAL_CSV_URL.startsWith("http")) {
      try { viralRes = await fetchCSV(VIRAL_CSV_URL); } catch (e) { console.warn("바이럴 데이터 로드 실패"); }
    }

    const [dataRes, revRes, contractRes, aiRes] = await Promise.all([
      fetchCSV(DATA_CSV_URL), fetchCSV(REVENUE_CSV_URL), fetchCSV(CONTRACT_CSV_URL), fetchCSV(AI_CSV_URL, false),
    ]);

    masterData = dataRes.data.map((r) => {
        const row = {};
        for (let k in r) row[k.replace(/[\uFEFF]/g, "").trim().toLowerCase()] = r[k];
        return {
          date: normalizeDateStr(row["date"] || row["날짜"] || ""),
          platform: (row["platform"] || row["매체"] || "").trim(),
          adName: (row["ad"] || row["광고명"] || row["campaign"] || "-").trim(),
          impression: parseNum(row["impression"] || row["노출"]),
          click: parseNum(row["click"] || row["클릭"]),
          view: parseNum(row["view"] || row["조회수"]),
          adSpend: parseNum(row["ad spend"] || row["광고비"]),
          conversions: parseNum(row["conversions"] || row["전환"]),
          revenue: parseNum(row["conversion revenue"] || row["매출액"]),
        };
      }).filter((r) => r.platform && r.date && r.date <= YESTERDAY_STR);

    contractRes.data.forEach((r) => {
      const row = {};
      for (let k in r) row[k.replace(/[\uFEFF]/g, "").trim().toLowerCase()] = r[k];
      const startStr = normalizeDateStr(row["start_date"] || row["시작일"]);
      const endStr = normalizeDateStr(row["end_date"] || row["종료일"]);
      const dailyCost = parseNum(row["daily_cost"] || row["일별광고비"]);
      const platform = (row["platform"] || row["매체"] || "Naver").trim();
      const adName = (row["ad"] || row["광고명"] || "계약형광고").trim();

      if (startStr && endStr && dailyCost > 0) {
        const s = startStr.split("-"); let d = new Date(s[0], s[1] - 1, s[2]);
        const e = endStr.split("-"); let endD = new Date(e[0], e[1] - 1, e[2]);
        if (endD > yesterdayDate) endD = yesterdayDate;
        while (d <= endD) {
          masterData.push({ date: getLocalYYYYMMDD(d), platform, adName, impression: 0, click: 0, view: 0, adSpend: dailyCost, conversions: 0, revenue: 0 });
          d.setDate(d.getDate() + 1);
        }
      }
    });

    masterRevenueData = revRes.data.map((r) => {
        const row = {};
        for (let k in r) row[k.replace(/[\uFEFF]/g, "").trim().toLowerCase()] = r[k];
        return {
          date: normalizeDateStr(row["date"] || row["날짜"] || ""),
          platform: (row["platform"] || row["채널"] || "").trim(),
          total_revenue: parseNum(row["total_revenue"] || row["총결제금액"] || row["매출"]),
          category: (row["category"] || row["분류"] || "스토어").trim(), 
        };
      }).filter((r) => r.date && r.date <= YESTERDAY_STR);

    const revAdjustmentMap = {};
    masterRevenueData.forEach(item => {
      const key = `${item.date}_${item.platform}`;
      if (!revAdjustmentMap[key]) revAdjustmentMap[key] = { storeItem: null, coopTotal: 0 };
      
      if (item.category.includes("공구")) {
        revAdjustmentMap[key].coopTotal += item.total_revenue;
      } 
      else if (item.category === "스토어") {
        revAdjustmentMap[key].storeItem = item;
      }
    });

    Object.values(revAdjustmentMap).forEach(group => {
      if (group.storeItem && group.coopTotal > 0) {
        group.storeItem.total_revenue = Math.max(0, group.storeItem.total_revenue - group.coopTotal);
      }
    });
      
    masterViralData = viralRes.data.map((r) => {
        const row = {};
        for (let k in r) row[k.replace(/[\uFEFF]/g, "").trim().toLowerCase()] = r[k];
        return {
            date: normalizeDateStr(row["날짜"] || ""),
            community: (row["커뮤니티 명"] || row["커뮤니티명"] || "-").trim(),
            topic: (row["주제"] || "-").trim(),
            url: (row["url"] || "").trim(),
            views: parseNum(row["조회수"]),
            comments: parseNum(row["댓글"]),
            likes: parseNum(row["좋아요"]),
            note: (row["비고"] || "-").trim()
        };
    }).filter(r => r.date && r.date <= YESTERDAY_STR);

    if (aiRes.data && aiRes.data.length > 0) {
      const validRows = aiRes.data.filter(row => row && row[0] && row[0].trim() !== '성과 요약' && row[0].trim() !== '');
      if (validRows.length > 0) {
          const dataRow = validRows[validRows.length - 1]; 
          aiParsedData = {
              summary: dataRow[0] || "데이터 없음", best: dataRow[1] || "-", worst: dataRow[2] || "-", insight: dataRow[3] || "-", action: dataRow[4] || "-"
          };
      }
    }

    fpInstance = flatpickr("#date-range", {
      mode: "range", locale: "ko", dateFormat: "Y-m-d", maxDate: yesterdayDate,
      onChange: (s) => s.length === 2 && applyDateFilter(s[0], s[1]),
    });

    setQuickDate(30, document.querySelectorAll(".btn-quick-date")[3]);
    initDashboard();
  } catch (error) {
    document.getElementById("content-container").innerHTML = "데이터 로드 오류. 공유 설정을 확인하세요.";
  }
};

function setQuickDate(days, btn) {
  document.querySelectorAll(".btn-quick-date").forEach((el) => el.classList.remove("active"));
  btn?.classList.add("active");
  const end = new Date(yesterdayDate), start = new Date(yesterdayDate);
  start.setDate(end.getDate() - (days === 1 ? 0 : days - 1));
  fpInstance.setDate([start, end]);
  applyDateFilter(start, end);
}

function applyDateFilter(s, e) {
  const sS = getLocalYYYYMMDD(s), eS = getLocalYYYYMMDD(e);
  currentData = masterData.filter((d) => d.date >= sS && d.date <= eS);
  currentRevenueData = masterRevenueData.filter((d) => d.date >= sS && d.date <= eS);
  currentViralData = masterViralData.filter((d) => d.date >= sS && d.date <= eS);
  initDashboard(true);
}

function changeCategoryFilter(val) { currentCategoryFilter = val; renderTab(currentTab, true); }

function initDashboard(onlyRender = false) {
  platforms = [...new Set(currentData.map((d) => d.platform))];
  const categories = [...new Set(currentRevenueData.map(d => d.category))].filter(c => c);
  
  if (!["DASHBOARD", "TOTAL", "AI", "COOP", "VIRAL"].includes(currentTab) && !platforms.includes(currentTab)) currentTab = "TOTAL";

  const nav = document.getElementById("nav-container");
  let h = `<div class="nav-item" onclick="switchTab('DASHBOARD')">대시보드 홈</div><div class="nav-item" onclick="switchTab('TOTAL')">Total 통합 실적</div>`;
  
  h += `<div style="margin: 20px 0 8px 16px; font-size: 11px; color: #475569; font-weight: 700; text-transform: uppercase;">Channels</div>`;
  platforms.forEach((p) => (h += `<div class="nav-item" onclick="switchTab('${p}')">${p}</div>`));
  
  h += `<div style="margin: 20px 0 8px 16px; font-size: 11px; color: #475569; font-weight: 700; text-transform: uppercase;">Insights</div>`;
  h += `<div class="nav-item" onclick="switchTab('AI')">AI 리포트</div>`;
  h += `<div class="nav-item" onclick="switchTab('COOP')">공동구매 분석</div>`;
  h += `<div class="nav-item" onclick="switchTab('VIRAL')">바이럴 진행</div>`;
  nav.innerHTML = h;

  const filterArea = document.querySelector('.controls-top');
  let select = document.getElementById('category-filter-select');

  if (!select) {
    select = document.createElement('select'); select.id = 'category-filter-select'; select.className = 'ad-filter-select';
    select.onchange = (e) => changeCategoryFilter(e.target.value);
    filterArea.insertBefore(select, filterArea.firstChild);
  }
  
  let options = `<option value="ALL" ${currentCategoryFilter === 'ALL' ? 'selected' : ''}>매출 전체 보기</option>`;
  options += `<option value="순매출" ${currentCategoryFilter === '순매출' ? 'selected' : ''}>가구매/공구 제외(순매출)</option>`;
  categories.sort().forEach(c => { options += `<option value="${c}" ${currentCategoryFilter === c ? 'selected' : ''}>${c}</option>`; });
  select.innerHTML = options;

  if (currentCategoryFilter !== "ALL" && currentCategoryFilter !== "순매출" && !categories.includes(currentCategoryFilter)) {
    currentCategoryFilter = "ALL"; select.value = "ALL";
  }
  
  if(currentTab === 'VIRAL' || currentTab === 'AI' || currentTab === 'COOP') {
      select.style.display = 'none';
  } else {
      select.style.display = 'block';
  }
  
  switchTab(currentTab);
}

function switchTab(t) {
  currentTab = t; currentAdFilter = "ALL";
  
  let pageTitle = t;
  if(t === "DASHBOARD") pageTitle = "대시보드 종합 요약";
  else if(t === "TOTAL") pageTitle = "TOTAL 성과 데이터";
  else if(t === "AI") pageTitle = "AI 분석 리포트";
  else if(t === "COOP") pageTitle = "공동구매 성과 인사이트";
  else if(t === "VIRAL") pageTitle = "바이럴 마케팅 진행 현황"; 
  else pageTitle = `${t} 채널 성과`;
  
  document.getElementById("page-title").innerText = pageTitle;
  
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove("active");
    if (t === "DASHBOARD" && el.innerText.includes("대시보드")) el.classList.add("active");
    else if (t === "TOTAL" && el.innerText.includes("Total")) el.classList.add("active");
    else if (t === "AI" && el.innerText.includes("AI")) el.classList.add("active");
    else if (t === "COOP" && el.innerText.includes("공동구매")) el.classList.add("active");
    else if (t === "VIRAL" && el.innerText.includes("바이럴")) el.classList.add("active");
    else if (el.innerText === t) el.classList.add("active");
  });

  document.getElementById("btn-export").style.display = (t !== "DASHBOARD" && t !== "AI" && t !== "COOP" && t !== "VIRAL") ? "flex" : "none";
  
  const catSelect = document.getElementById('category-filter-select');
  if(catSelect) catSelect.style.display = (t === 'VIRAL' || t === 'AI' || t === 'COOP') ? 'none' : 'block';

  renderTab(t);
}

function calculateMetrics(imp, clk, view, spd, conv, rev) {
  return {
    imp, clk, view, spd, conv, rev,
    ctr: imp > 0 ? ((clk / imp) * 100).toFixed(2) : "0.00",
    cpc: clk > 0 ? (spd / clk).toFixed(0) : "0",
    vtr: imp > 0 ? ((view / imp) * 100).toFixed(2) : "0.00",
    cpv: view > 0 ? (spd / view).toFixed(0) : "0",
    cr: clk > 0 ? ((conv / clk) * 100).toFixed(2) : "0.00",
    cps: conv > 0 ? (spd / conv).toFixed(0) : "0",
    roas: spd > 0 ? ((rev / spd) * 100).toFixed(0) : "0",
  };
}
function setTrendInterval(val) { trendInterval = val; renderTab("DASHBOARD"); }

function renderTab(tab, isFilterChange = false) {
  const c = document.getElementById("content-container");
  if (!isFilterChange) {
    c.innerHTML = "";
    Object.values(chartInstances).forEach((i) => { if (i && typeof i.destroy === "function") i.destroy(); });
  }
  
  const iconRev = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="5" rx="2" ry="2"></rect><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><path d="M10 21v-4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v4"></path></svg>`;        
  const iconSpd = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
  const iconAdRev = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>`;
  const iconClk = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;        
  // [수정] CPS용 가격표 아이콘 추가
  const iconCps = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;
 
  if (tab === "VIRAL") {
      let totalPosts = currentViralData.length;
      let totalViews = 0, totalComments = 0, totalLikes = 0;
      let viewsByComm = {};
      let dailyTrend = {};

      currentViralData.forEach(d => {
          totalViews += d.views;
          totalComments += d.comments;
          totalLikes += d.likes;

          viewsByComm[d.community] = (viewsByComm[d.community] || 0) + d.views;

          if(!dailyTrend[d.date]) dailyTrend[d.date] = { views: 0, engagement: 0 };
          dailyTrend[d.date].views += d.views;
          dailyTrend[d.date].engagement += (d.comments + d.likes);
      });

      const totalEngagement = totalComments + totalLikes;
      const avgViews = totalPosts > 0 ? (totalViews / totalPosts).toFixed(0) : 0;

      const iconPost = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
      const iconView = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      const iconEngage = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;

      c.innerHTML = `
          <div class="grid-scorecards">
              <div class="card">
                  <div class="scorecard-header"><div class="scorecard-icon icon-blue">${iconPost}</div><h3 class="card-title">총 게시물 수</h3></div>
                  <div class="card-value">${totalPosts.toLocaleString()} <span style="font-size:14px; color:var(--text-sub); font-weight:600;">건</span></div>
              </div>
              <div class="card">
                  <div class="scorecard-header"><div class="scorecard-icon icon-green">${iconView}</div><h3 class="card-title">총 조회수</h3></div>
                  <div class="card-value">${totalViews.toLocaleString()}</div>
              </div>
              <div class="card">
                  <div class="scorecard-header"><div class="scorecard-icon icon-red">${iconEngage}</div><h3 class="card-title">총 반응수 (댓글+좋아요)</h3></div>
                  <div class="card-value">${totalEngagement.toLocaleString()}</div>
                  <div class="breakdown-text"><span><span style="color:var(--text-sub);">댓글</span> <b style="color:var(--text-main);">${totalComments.toLocaleString()}</b></span> <span style="color:#cbd5e1; margin:0 4px;">|</span> <span><span style="color:var(--text-sub);">좋아요</span> <b style="color:var(--text-main);">${totalLikes.toLocaleString()}</b></span></div>
              </div>
              <div class="card">
                  <div class="scorecard-header"><div class="scorecard-icon icon-orange">${iconView}</div><h3 class="card-title">게시물 당 평균 조회수</h3></div>
                  <div class="card-value">${Number(avgViews).toLocaleString()}</div>
              </div>
          </div>

          <div class="grid-charts" style="grid-template-columns: 2fr 1fr;">
              <div class="card" style="height:340px;">
                  <h3 class="card-title" style="font-size:15px; margin-bottom:12px;">일자별 바이럴 확산 추이</h3>
                  <div class="chart-container"><canvas id="viralTrendChart"></canvas></div>
              </div>
              <div class="card" style="height:340px;">
                  <h3 class="card-title" style="font-size:15px; margin-bottom:12px;">커뮤니티별 조회수 점유율</h3>
                  <div class="chart-container"><canvas id="viralPieChart"></canvas></div>
              </div>
          </div>

          <div class="card" style="padding:0">
              <div class="table-header"><div class="table-title">바이럴 상세 리스트</div></div>
              <div class="table-wrapper">
                  <table>
                      <colgroup>
                          <col style="width: 110px;">
                          <col style="width: auto;"> <col style="width: 120px;">
                          <col style="width: 100px;"> <col style="width: 90px;">
                          <col style="width: 80px;">
                          <col style="width: 80px;">
                          <col style="width: 200px;">
                      </colgroup>
                      <thead>
                          <tr>
                              <th>업로드 날짜</th>
                              <th>커뮤니티 명</th>
                              <th>주제</th>
                              <th>URL</th>
                              <th style="text-align:right;">조회수</th>
                              <th style="text-align:right;">댓글</th>
                              <th style="text-align:right;">좋아요</th>
                              <th>비고</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${currentViralData.sort((a,b) => b.date.localeCompare(a.date)).map(d => `
                              <tr class="${getDayClass(d.date)}">
                                  <td style="white-space: nowrap;">${d.date}</td>
                                  <td style="font-weight:600; color:var(--text-main); line-height:1.4;">${d.community}</td>
                                  <td>${d.topic}</td>
                                  <td>${d.url && d.url !== '-' ? `<a href="${d.url}" target="_blank" style="color:var(--accent); text-decoration:none; font-weight:600;">[링크 이동]</a>` : '-'}</td>
                                  <td style="color:var(--text-main); font-weight:700; text-align:right;">${d.views.toLocaleString()}</td>
                                  <td style="text-align:right;">${d.comments.toLocaleString()}</td>
                                  <td style="text-align:right;">${d.likes.toLocaleString()}</td>
                                  <td style="color:var(--text-sub); font-size:12px; line-height:1.4;">${d.note}</td>
                              </tr>
                          `).join('')}
                          ${currentViralData.length === 0 ? `<tr><td colspan="8" style="text-align:center; padding: 40px; color:var(--text-sub);">해당 기간에 등록된 바이럴 데이터가 없습니다.</td></tr>` : ''}
                      </tbody>
                  </table>
              </div>
          </div>
      `;

      const trendLabels = Object.keys(dailyTrend).sort();
      chartInstances.viralTrend = new Chart(document.getElementById("viralTrendChart"), {
          data: {
              labels: trendLabels,
              datasets: [
                  { type: "bar", label: "조회수", data: trendLabels.map(l => dailyTrend[l].views), backgroundColor: "#cbd5e1", yAxisID: "y", borderRadius: 4, order: 2, maxBarThickness: 32 },
                  { type: "line", label: "반응수(댓글+좋아요)", data: trendLabels.map(l => dailyTrend[l].engagement), borderColor: "#ef4444", backgroundColor: "#ef4444", borderWidth: 2.5, yAxisID: "y1", pointRadius: 4, pointBackgroundColor: "#fff", tension: 0.3, order: 1 }
              ]
          },
          options: { 
              responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
              plugins: { 
                  legend: { 
                      position: 'top', 
                      labels: { 
                          usePointStyle: false, 
                          useBorderRadius: true, 
                          borderRadius: 3, 
                          boxWidth: 18, 
                          boxHeight: 6 
                      } 
                  } 
              },
              scales: { x: { grid: { display: false } }, y: { position: "left", grid: defaultGrid }, y1: { position: "right", grid: { display: false } } }
          }
      });

      const groupedCommPieData = getReadablePieAggregation(viewsByComm, "기타 커뮤니티");
      const pieCommLabels = Object.keys(groupedCommPieData);
      const pieCommValues = Object.values(groupedCommPieData);

      chartInstances.viralPie = new Chart(document.getElementById("viralPieChart"), {
          type: "doughnut",
          data: {
              labels: pieCommLabels,
              datasets: [{ data: pieCommValues, backgroundColor: pieCommLabels.map((p, i) => palette[i % palette.length]), borderWidth: 0, borderRadius: pieCommLabels.length <= 1 ? 0 : 6, spacing: 4 }]
          },
          options: { maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } } } }
      });

      return;
  }

  if (tab === "AI") {
    c.innerHTML = `
      <div class="ai-dashboard">
        <div class="ai-summary-banner">
          <span>✦ AI Insights</span>
          <p>${aiParsedData.summary}</p>
        </div>
        <div class="ai-grid-cards">
          <div class="ai-card-base ai-highlight-card best">
            <div class="ai-icon-wrapper">
<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
<path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
</svg>
</div>
            <div class="ai-card-content"><h4>최고 효율 매체</h4><p>${aiParsedData.best}</p></div>
          </div>
          <div class="ai-card-base ai-highlight-card worst">
            <div class="ai-icon-wrapper">
<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
<line x1="12" y1="9" x2="12" y2="13"></line>
<line x1="12" y1="17" x2="12.01" y2="17"></line>
</svg>
</div>
            <div class="ai-card-content"><h4>집중 모니터링 매체</h4><p>${aiParsedData.worst}</p></div>
          </div>
        </div>
        <div class="ai-card-base ai-section">
          <h3>💡 핵심 분석</h3><div class="ai-text-content">${aiParsedData.insight}</div>
        </div>
        <div class="ai-card-base ai-section">
          <h3>📌 Action Plan</h3><div class="ai-action-box">${aiParsedData.action}</div>
        </div>
      </div>
    `;
    return;
  }

  if (tab === "COOP") {
      const coopData = currentRevenueData.filter(d => d.category.includes("공구"));
      const coopAgg = {};
      let totalCoopRev = 0;
      coopData.forEach(d => {
          coopAgg[d.category] = (coopAgg[d.category] || 0) + d.total_revenue;
          totalCoopRev += d.total_revenue;
      });
      const sortedCoop = Object.entries(coopAgg).sort((a,b) => b[1] - a[1]);

      c.innerHTML = `
          <div class="ai-dashboard">
              <div class="ai-card-base ai-section" style="padding: 32px;">
                  <div class="scorecard-header">
                      <div class="scorecard-icon" style="background: #f1f5f9; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center;">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                      </svg>
                      </div>
                      <h3 class="card-title" style="font-size: 15px; font-weight: 700; color: var(--text-main); margin: 0;">공동구매 총 매출</h3>
                  </div>
                  <div class="card-value" style="font-size: 36px;">₩${totalCoopRev.toLocaleString()}</div>
                  <p style="color:var(--text-sub); margin-top:10px; font-weight:500; font-size:13px;">선택된 기간 내 인플루언서 공구 매출 합계입니다.</p>
              </div>
              <div class="grid-charts" style="grid-template-columns: 1fr 1fr;">
                  <div class="card" style="height:380px;">
                      <h3 class="card-title" style="font-size:15px; margin-bottom: 12px;">매출 랭킹</h3>
                      <div class="chart-container"><canvas id="coopBarChart"></canvas></div>
                  </div>
                  <div class="card" style="height:380px;">
                      <h3 class="card-title" style="font-size:15px; margin-bottom: 12px;">매출 비중</h3>
                      <div class="chart-container"><canvas id="coopPieChart"></canvas></div>
                  </div>
              </div>
              <div class="card" style="padding:0;">
                  <div class="table-header"><div class="table-title">상세 실적 현황</div></div>
                  <div class="table-wrapper">
                      <table>
                          <thead><tr><th>순위</th><th>카테고리명</th><th>총 매출액</th><th>비중(%)</th></tr></thead>
                          <tbody>
                              ${sortedCoop.map(([cat, rev], idx) => `
                                  <tr>
                                    <td>${idx + 1}</td>
                                    <td style="font-weight:600; color:var(--text-main);">${cat}</td>
                                    <td>₩${rev.toLocaleString()}</td>
                                    <td>${totalCoopRev > 0 ? ((rev/totalCoopRev)*100).toFixed(1) : 0}%</td>
                                  </tr>
                              `).join('')}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      `;
      chartInstances.coopBar = new Chart(document.getElementById('coopBarChart'), {
          type: 'bar',
          data: { labels: sortedCoop.map(x => x[0]), datasets: [{ label: '매출액', data: sortedCoop.map(x => x[1]), backgroundColor: palette, borderRadius: 6, borderSkipped: false }] },
          options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: defaultGrid }, y: { grid: { display: false } } } }
      });
      const groupedCoopPieData = getReadablePieAggregation(coopAgg, "기타 공동구매");
      const coopPieLabels = Object.keys(groupedCoopPieData);
      const coopPieValues = Object.values(groupedCoopPieData);
      
      chartInstances.coopPie = new Chart(document.getElementById('coopPieChart'), {
          type: 'doughnut',
          data: { 
              labels: coopPieLabels, 
              datasets: [{ 
                  data: coopPieValues, 
                  backgroundColor: coopPieLabels.map((p, i) => palette[i % palette.length]),
                  borderWidth: 0, 
                  borderRadius: coopPieLabels.length === 1 ? 0 : 8, 
                  spacing: coopPieLabels.length === 1 ? 0 : 4 
              }] 
          },
          options: { maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } } } }
      });
      return;
  }

  let baseData = tab === "TOTAL" || tab === "DASHBOARD" ? currentData : currentData.filter((d) => d.platform === tab);
  
  const getBreakdownHtml = (data, isGlobal) => {
    let bSpd = {}, bRev = {}, bClk = {}, bConv = {};
    data.forEach(d => {
        let key = isGlobal ? d.platform : d.adName; 
        bSpd[key] = (bSpd[key] || 0) + d.adSpend;
        bRev[key] = (bRev[key] || 0) + d.revenue;
        bClk[key] = (bClk[key] || 0) + d.click;
        bConv[key] = (bConv[key] || 0) + d.conversions;
    });
    const makeHtml = (dict, type) => {
        const details = Object.entries(dict).filter(([k, v]) => v > 0).sort((a, b) => b[1] - a[1]) 
            .map(([k, v]) => `<span><span style="color:var(--text-sub);">${k}</span> <b style="color:var(--text-main);">${v.toLocaleString()}</b></span>`)
            .join(' <span style="color:#cbd5e1; margin:0 4px;">|</span> ');
        return details ? `<div id="${type}-b" class="breakdown-text">${details}</div>` : `<div id="${type}-b" style="display:none;"></div>`;
    };

    // [수정] 전환 단가(CPS) 전용 하단 내역 생성 로직 추가
    const detailsCps = Object.keys(bConv).filter(k => bConv[k] > 0).sort((a,b) => bConv[b] - bConv[a])
        .map(k => `<span><span style="color:var(--text-sub);">${k}</span> <b style="color:var(--text-main);">₩&nbsp;${Number((bSpd[k]/bConv[k]).toFixed(0)).toLocaleString()}</b></span>`)
        .join(' <span style="color:#cbd5e1; margin:0 4px;">|</span> ');
    const htmlCps = detailsCps ? `<div id="cps-b" class="breakdown-text">${detailsCps}</div>` : `<div id="cps-b" style="display:none;"></div>`;

    return { htmlSpd: makeHtml(bSpd, 'spd'), htmlRev: makeHtml(bRev, 'rev'), htmlClk: makeHtml(bClk, 'clk'), htmlCps };
  };

  let mappedTabForRev = tab;
  if (tab.toLowerCase() === "meta" || tab === "메타") mappedTabForRev = "자사";

  let filteredRevenue = currentRevenueData;
  if (currentCategoryFilter === "순매출") {
      filteredRevenue = currentRevenueData.filter(d => d.category === "스토어" || (!d.category.includes("가구매") && !d.category.includes("공구")));
  } else if (currentCategoryFilter !== "ALL") {
      filteredRevenue = currentRevenueData.filter(d => d.category === currentCategoryFilter);
  }

  let totalMallRevenue = 0, revByPlatform = {}, revByCategory = {}; 
  filteredRevenue.forEach((d) => {
    if ((tab === "TOTAL" || tab === "DASHBOARD") || d.platform.toLowerCase().includes(mappedTabForRev.toLowerCase())) {
      totalMallRevenue += d.total_revenue;
      revByPlatform[d.platform] = (revByPlatform[d.platform] || 0) + d.total_revenue;
      revByCategory[d.category] = (revByCategory[d.category] || 0) + d.total_revenue;
    }
  });

  let revBreakdownHtml = Object.keys(revByPlatform).length > 0 
    ? `<div id="m-b" class="breakdown-text">` + Object.entries(revByPlatform).sort((a, b) => b[1] - a[1]).map(([p, v]) => `<span><span style="color:var(--text-sub);">${p}</span> <b style="color:var(--text-main);">${v.toLocaleString()}</b></span>`).join(' <span style="color:#cbd5e1; margin:0 4px;">|</span> ') + `</div>`
    : `<div id="m-b" style="display:none;"></div>`;

  let catBreakdownHtml = Object.keys(revByCategory).length > 0 
    ? `<div id="c-b" class="breakdown-text" style="border-top: 1px dashed #e2e8f0; padding-top: 12px; margin-top: 12px;">` + Object.entries(revByCategory).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<span><span style="color:var(--accent); font-weight:600;">${c}</span> <b style="color:var(--text-main);">${v.toLocaleString()}</b></span>`).join(' <span style="color:#cbd5e1; margin:0 4px;">|</span> ') + `</div>`
    : ``;

  if (tab === "DASHBOARD") {
    const m = aggregateData(baseData);
    
    // [수정] 공동구매 매출 계산 및 순수 스토어 매출 산출
    let totalCoopRev = 0;
    const coopBreakdown = {};
    filteredRevenue.forEach(d => {
        if (d.category.includes("공구")) {
            totalCoopRev += d.total_revenue;
            coopBreakdown[d.category] = (coopBreakdown[d.category] || 0) + d.total_revenue;
        }
    });

    // 전체 매출에서 공구 매출을 제외한 순수 스토어 매출 및 ROAS 계산
    const pureStoreRevenue = Math.max(0, totalMallRevenue - totalCoopRev);
    const pureMallRoas = m.spd > 0 ? ((pureStoreRevenue / m.spd) * 100).toFixed(0) : 0;

    const iconCoop = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`;
    
    const htmlCoop = totalCoopRev > 0 
        ? `<div class="breakdown-text">` + Object.entries(coopBreakdown).sort((a,b) => b[1]-a[1]).map(([k,v]) => `<span><span style="color:var(--text-sub);">${k}</span> <b style="color:var(--text-main);">${v.toLocaleString()}</b></span>`).join(' <span style="color:#cbd5e1; margin:0 4px;">|</span> ') + `</div>`
        : `<div class="breakdown-text" style="color: #94a3b8; font-weight: 500;">💡 선택된 기간 내 진행 내역이 없습니다.</div>`;

    const { htmlSpd, htmlRev } = getBreakdownHtml(baseData, true);

    c.innerHTML = `
        <div class="grid-scorecards">
            <div class="card">
                <div class="scorecard-header">
                    <div class="scorecard-icon icon-blue">${iconRev}</div>
                    <h3 class="card-title">스토어 매출 (공구 제외 ROAS ${pureMallRoas}%)</h3>
                </div>
                <div class="card-value">₩&nbsp;${pureStoreRevenue.toLocaleString()}</div>
                ${revBreakdownHtml}
            </div>
            <div class="card">
                <div class="scorecard-header"><div class="scorecard-icon icon-red">${iconSpd}</div><h3 class="card-title">총 광고비</h3></div>
                <div class="card-value" id="tot-spd">₩&nbsp;${m.spd.toLocaleString()}</div>${htmlSpd}
            </div>
            <div class="card">
                <div class="scorecard-header"><div class="scorecard-icon icon-green">${iconAdRev}</div><h3 class="card-title">광고 매출 (Ad ROAS ${m.roas}%)</h3></div>
                <div class="card-value" id="tot-rev">₩&nbsp;${m.rev.toLocaleString()}</div>${htmlRev}
            </div>
            <div class="card">
                <div class="scorecard-header">
                    <div class="scorecard-icon icon-orange">${iconCoop}</div>
                    <h3 class="card-title">공동구매 총 매출</h3>
                </div>
                <div class="card-value">${totalCoopRev > 0 ? '₩&nbsp;' + totalCoopRev.toLocaleString() : '<span style="font-size:16px; color:#94a3b8; font-weight:600;">진행 데이터 없음</span>'}</div>
                ${htmlCoop}
            </div>
        </div>
        <div class="grid-charts">
            <div class="card" style="height:340px;">
                <div class="chart-header" style="margin-bottom: 12px;">
                    <h3 class="card-title" style="font-size:15px;">전체 성과 트렌드</h3>
                    <div>
                        <button class="btn-toggle ${trendInterval === "day" ? "active" : ""}" onclick="setTrendInterval('day')">일</button>
                        <button class="btn-toggle ${trendInterval === "week" ? "active" : ""}" onclick="setTrendInterval('week')">주</button>
                        <button class="btn-toggle ${trendInterval === "month" ? "active" : ""}" onclick="setTrendInterval('month')">월</button>
                    </div>
                </div>
                <div class="chart-container" style="flex:1;"><canvas id="trendChart"></canvas></div>
            </div>
            <div class="card" style="height:340px;"><canvas id="pieChart"></canvas></div>
        </div>
        <div class="grid-charts" style="grid-template-columns: 1fr 2fr;">
            <div class="card" style="height:300px;"><h3 class="card-title" style="font-size:15px; margin-bottom: 12px;">전환 추이</h3><div class="chart-container"><canvas id="cvrChart"></canvas></div></div>
            <div class="card" style="height:300px;"><h3 class="card-title" style="font-size:15px; margin-bottom: 12px;">스토어별 매출 추이</h3><div class="chart-container"><canvas id="spendRevChart"></canvas></div></div>
        </div>
        <div class="grid-charts-full"><div class="card" style="height:300px;"><canvas id="roasChart"></canvas></div></div>
    `;
    renderDashboardCharts(baseData, filteredRevenue);
    return;
  }

  let displayData = currentAdFilter === "ALL" ? baseData : baseData.filter((d) => d.adName === currentAdFilter);
  const m = aggregateData(displayData);
  const mallRoas = m.spd > 0 ? ((totalMallRevenue / m.spd) * 100).toFixed(0) : 0;
  const mainTitleText = tab.toLowerCase() === "meta" || tab === "메타" ? "자사몰 총 매출" : "스토어 총 매출";
  const isGlobal = (tab === "TOTAL");
 // [수정] htmlCps 변수 호출 추가
  const { htmlSpd, htmlRev, htmlClk, htmlCps } = getBreakdownHtml(displayData, isGlobal);

  if (!isFilterChange) {
    c.innerHTML = `
        <div class="grid-scorecards">
            <div class="card">
                <div class="scorecard-header"><div class="scorecard-icon icon-blue">${iconRev}</div><h3 class="card-title" id="m-t">${mainTitleText} (몰 ROAS ${mallRoas}%)</h3></div>
                <div class="card-value" id="m-v">₩&nbsp;${totalMallRevenue.toLocaleString()}</div>
                ${revBreakdownHtml}${catBreakdownHtml}
            </div>
            <div class="card">
                <div class="scorecard-header"><div class="scorecard-icon icon-red">${iconSpd}</div><h3 class="card-title">광고비</h3></div>
                <div class="card-value" id="tot-spd">₩&nbsp;${m.spd.toLocaleString()}</div>${htmlSpd}
            </div>
            <div class="card">
                <div class="scorecard-header"><div class="scorecard-icon icon-green">${iconAdRev}</div><h3 class="card-title" id="tot-roas">광고 매출액 (Ad ROAS ${m.roas}%)</h3></div>
                <div class="card-value" id="tot-rev">₩&nbsp;${m.rev.toLocaleString()}</div>${htmlRev}
            </div>
            <div class="card">
                <div class="scorecard-header"><div class="scorecard-icon icon-orange">${iconCps}</div><h3 class="card-title" id="tot-cps">전환 단가 (총 전환 ${m.conv.toLocaleString()}건)</h3></div>
                <div class="card-value" id="tot-cps-val">₩&nbsp;${Number(m.cps).toLocaleString()}</div>${htmlCps}
            </div>
        </div>
        <div class="grid-charts-full"><div class="card" style="height:340px;"><canvas id="lineChart"></canvas></div></div>
        
        <div class="grid-charts" style="grid-template-columns: 2fr 1fr;">
            <div class="card" style="height:340px;">
                <h3 class="card-title" style="font-size:16px; font-weight:700; color:var(--text-main); margin-bottom: 12px;">${tab === 'TOTAL' ? '매체별' : '광고별'} 매출 추이</h3>
                <div class="chart-container"><canvas id="adRevTrendChart"></canvas></div>
            </div>
            <div class="card" style="height:340px;"><canvas id="pieChart"></canvas></div>
        </div>
        
        <div class="card" style="padding:0" id="table-card"><div class="table-header"><div class="table-title">상세 데이터 테이블</div><div id="ad-filter-area"></div></div><div id="data-table"></div></div>
    `;
    const uniqueAds = [...new Set(baseData.map((d) => d.adName).filter((n) => n && n !== "-"))];
    if (uniqueAds.length) {
      let s = `<select class="ad-filter-select" onchange="changeAdFilter(this.value)"><option value="ALL">전체 캠페인</option>`;
      uniqueAds.forEach((a) => (s += `<option value="${a}">${a}</option>`));
      document.getElementById("ad-filter-area").innerHTML = s + `</select>`;
    }
  } else {
    document.getElementById("m-t").innerText = `${mainTitleText} (몰 ROAS ${mallRoas}%)`;
    // [수정] innerText를 innerHTML로 변경하여 띄어쓰기(&nbsp;) 적용
    document.getElementById("m-v").innerHTML = `₩&nbsp;${totalMallRevenue.toLocaleString()}`;
    const scorecardCard = document.getElementById("m-t").closest('.card');
    if (scorecardCard) {
        const oldMB = document.getElementById("m-b"); const oldCB = document.getElementById("c-b");
        if (oldMB) oldMB.remove(); if (oldCB) oldCB.remove();
        scorecardCard.insertAdjacentHTML('beforeend', revBreakdownHtml + catBreakdownHtml);
    }
    // [수정] 모두 innerHTML 기반 띄어쓰기 적용
    document.getElementById("tot-spd").innerHTML = `₩&nbsp;${m.spd.toLocaleString()}`;
    document.getElementById("tot-roas").innerText = `광고 매출액 (Ad ROAS ${m.roas}%)`;
    document.getElementById("tot-rev").innerHTML = `₩&nbsp;${m.rev.toLocaleString()}`;
    
    const elCpsTitle = document.getElementById("tot-cps");
    if (elCpsTitle) elCpsTitle.innerText = `전환 단가 (총 전환 ${m.conv.toLocaleString()}건)`;
    const elCpsVal = document.getElementById("tot-cps-val");
    if (elCpsVal) elCpsVal.innerHTML = `₩&nbsp;${Number(m.cps).toLocaleString()}`;

    // [수정] clk를 cps로 변경하고, 하단 내역 삽입
    ['spd', 'rev', 'cps'].forEach(type => {
        const oldEl = document.getElementById(type + "-b"); if (oldEl) oldEl.remove();
    });
    document.getElementById("tot-spd").parentElement.insertAdjacentHTML('beforeend', htmlSpd);
    document.getElementById("tot-rev").parentElement.insertAdjacentHTML('beforeend', htmlRev);
    if(document.getElementById("tot-cps-val")) document.getElementById("tot-cps-val").parentElement.insertAdjacentHTML('beforeend', htmlCps);
    // 클릭(htmlClk) 내역 렌더링 코드는 카드 제거로 인해 삭제

    document.getElementById("table-card").innerHTML = `<div class="table-header"><div class="table-title">상세 데이터 테이블</div><div id="ad-filter-area"></div></div><div id="data-table"></div>`;
    const uniqueAds = [...new Set(baseData.map((d) => d.adName).filter((n) => n && n !== "-"))];
    if (uniqueAds.length) {
      let s = `<select class="ad-filter-select" onchange="changeAdFilter(this.value)"><option value="ALL">전체 캠페인</option>`;
      uniqueAds.forEach((a) => (s += `<option value="${a}" ${currentAdFilter === a ? "selected" : ""}>${a}</option>`));
      document.getElementById("ad-filter-area").innerHTML = s + `</select>`;
    }
    Object.values(chartInstances).forEach((i) => { if (i && i.destroy) i.destroy(); });
  }
  renderCharts(displayData, tab);
  renderTable(displayData);
}

function aggregateData(data) {
  let r = { imp: 0, clk: 0, view: 0, spd: 0, conv: 0, rev: 0 };
  data.forEach((d) => { r.imp += d.impression; r.clk += d.click; r.view += d.view; r.spd += d.adSpend; r.conv += d.conversions; r.rev += d.revenue; });
  return calculateMetrics(r.imp, r.clk, r.view, r.spd, r.conv, r.rev);
}

function renderDashboardCharts(data, filteredRev) {
  const trendGroups = {};
  const getK = (dt) => {
    if (trendInterval === "month") return dt.substring(0, 7);
    if (trendInterval === "day") return dt;
    const d = new Date(dt); return d.getMonth() + 1 + "월 " + Math.ceil(d.getDate() / 7) + "주";
  };

  data.forEach((d) => {
    const k = getK(d.date);
    if (!trendGroups[k]) trendGroups[k] = { s: 0, r: 0, c: 0, conv: 0, sr: 0, revByPlat: {}, minDate: d.date };
    if (d.date < trendGroups[k].minDate) trendGroups[k].minDate = d.date;
    trendGroups[k].s += d.adSpend; trendGroups[k].r += d.revenue; trendGroups[k].c += d.click; trendGroups[k].conv += d.conversions;
  });

  const uniqueRevPlatforms = new Set();

  filteredRev.forEach((d) => {
    const k = getK(d.date);
    if (trendGroups[k]) {
      trendGroups[k].sr += d.total_revenue;
      
      let platKey = d.platform;
      if (d.category && d.category.includes("공구")) {
        platKey = "공구";
      }

      trendGroups[k].revByPlat[platKey] = (trendGroups[k].revByPlat[platKey] || 0) + d.total_revenue;
      uniqueRevPlatforms.add(platKey);
    }
  });

  const labels = Object.keys(trendGroups).sort((a, b) => trendGroups[a].minDate.localeCompare(trendGroups[b].minDate));

  chartInstances.trend = new Chart(document.getElementById("trendChart"), {
    data: {
      labels,
      datasets: [
        { type: "bar", label: "광고비", data: labels.map((l) => trendGroups[l].s), backgroundColor: "#94a3b8", yAxisID: "y", borderRadius: 4, order: 2, maxBarThickness: 32 },
        { type: "line", label: "광고 매출", data: labels.map((l) => trendGroups[l].r), borderColor: "#3b82f6", backgroundColor: "#3b82f6", borderWidth: 2.5, yAxisID: "y1", pointRadius: 3, pointBackgroundColor: "#fff", tension: 0.3, order: 1 }
      ],
    },
    options: { 
      responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, 
      plugins: {
        legend: { labels: { usePointStyle: false, useBorderRadius: true, borderRadius: 3, boxWidth: 18, boxHeight: 6 } },
        tooltip: { callbacks: { label: function (context) { return context.dataset.label + ": ₩" + context.parsed.y.toLocaleString(); }, afterBody: function (context) { if (!context || context.length === 0) return ""; const l = context[0].label; const spd = trendGroups[l].s; const rev = trendGroups[l].r; const roas = spd > 0 ? ((rev / spd) * 100).toFixed(0) : 0; return `\n※ Ad ROAS: ${roas}%`; } } }
      },
      scales: { x: { grid: { display: false } }, y: { position: "left", grid: defaultGrid }, y1: { position: "right", grid: { display: false } } } 
    },
  });

  chartInstances.cvr = new Chart(document.getElementById("cvrChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "전환수", data: labels.map((l) => trendGroups[l].conv), borderColor: "#3b82f6", backgroundColor: "rgba(59, 130, 246, 0.05)", borderWidth: 2.5, fill: true, tension: 0.3, yAxisID: "y1" },
        { label: "전환 단가 (CPS)", data: labels.map((l) => trendGroups[l].conv > 0 ? (trendGroups[l].s / trendGroups[l].conv).toFixed(0) : 0), borderColor: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.1)", borderWidth: 2.5, fill: true, tension: 0.3, yAxisID: "y" }
      ],
    },
    options: { 
      responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      plugins: { 
        legend: { 
          display: true, 
          labels: { 
            usePointStyle: false, useBorderRadius: true, borderRadius: 3, boxWidth: 18, boxHeight: 6,
            generateLabels: function(chart) {
              const originalLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
              originalLabels.forEach(label => { label.fillStyle = label.strokeStyle; });
              return originalLabels;
            }
          } 
        } 
      },
      scales: { 
        x: { grid: { display: false } }, 
        y: { type: "linear", display: true, position: "left", beginAtZero: true, grid: defaultGrid },
        y1: { type: "linear", display: true, position: "right", beginAtZero: true, grid: { display: false } }
      } 
    },
  });

  const spendRevDatasets = [];
  let platIndex = 0;
  uniqueRevPlatforms.forEach(plat => {
    let color = brandColors[plat.toLowerCase()] || palette[platIndex % palette.length];
    
    if (plat === "자사몰") color = "#000000";
    if (plat === "공구") color = "#8b5cf6";

    const platData = labels.map((l) => trendGroups[l].revByPlat[plat] || 0);
    const totalRev = platData.reduce((sum, val) => sum + val, 0);

    if (totalRev > 0) {
      const isEventData = plat.includes("쿠팡") || plat.includes("공구");
      
      spendRevDatasets.push({
        type: isEventData ? "bar" : "line", 
        label: plat + " 매출", 
        data: platData, 
        borderColor: color, 
        backgroundColor: color, 
        borderWidth: isEventData ? 0 : 2.5, 
        borderRadius: isEventData ? 4 : 0,
        maxBarThickness: isEventData ? 32 : undefined,
        yAxisID: isEventData ? "y1" : "y", 
        pointRadius: isEventData ? 0 : labels.map((_, i) => (i === 0 || i === labels.length - 1) ? 3 : 0),
        pointHoverRadius: isEventData ? 0 : labels.map((_, i) => (i === 0 || i === labels.length - 1) ? 5 : 0),
        pointBackgroundColor: "#fff", 
        tension: 0.3, 
        order: isEventData ? 2 : 1 
      });
      platIndex++;
    }
  });

  chartInstances.spendRev = new Chart(document.getElementById("spendRevChart"), {
    data: {
      labels,
      datasets: spendRevDatasets,
    },
    options: { 
      responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, 
      plugins: { legend: { labels: { usePointStyle: false, useBorderRadius: true, borderRadius: 3, boxWidth: 18, boxHeight: 6 } }, tooltip: { callbacks: { label: function (context) { return context.dataset.label + ": ₩" + context.parsed.y.toLocaleString(); } } } },
      scales: { 
        x: { grid: { display: false } }, 
        y: { type: "linear", display: true, position: "left", grid: defaultGrid },
        y1: { type: "linear", display: true, position: "right", grid: { display: false } } 
      } 
    },
  });
  const pie = {};
  data.forEach((d) => (pie[d.platform] = (pie[d.platform] || 0) + d.adSpend));
  
  const groupedPieData = getReadablePieAggregation(pie, "기타 매체");
  const pieLabels = Object.keys(groupedPieData);
  const pieValues = Object.values(groupedPieData);

  chartInstances.pie = new Chart(document.getElementById("pieChart"), {
    type: "doughnut",
    data: { 
        labels: pieLabels, 
        datasets: [{ data: pieValues, backgroundColor: pieLabels.map(getConsistentColor), borderWidth: 0, borderRadius: pieLabels.length === 1 ? 0 : 8, spacing: pieLabels.length === 1 ? 0 : 4 }] 
    },
    options: { maintainAspectRatio: false, cutout: '70%', plugins: { title: { display: true, text: "매체별 광고비 비중", font: { size: 14, weight: "700" }, color: "#1e293b", padding: { bottom: 20 } }, legend: { position: "bottom", labels: { usePointStyle: true, padding: 16 } } } },
  });

  const roas = {};
  data.forEach((d) => {
    if (!roas[d.platform]) roas[d.platform] = { s: 0, r: 0 };
    roas[d.platform].s += d.adSpend; roas[d.platform].r += d.revenue;
  });
  chartInstances.roas = new Chart(document.getElementById("roasChart"), {
    type: "bar",
    data: { labels: Object.keys(roas), datasets: [{ label: "Ad ROAS (%)", data: Object.keys(roas).map((p) => roas[p].s > 0 ? ((roas[p].r / roas[p].s) * 100).toFixed(0) : 0), backgroundColor: Object.keys(roas).map((p) => brandColors[p.toLowerCase()] || "#cbd5e0"), borderRadius: 4, borderSkipped: false, maxBarThickness: 40 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: "매체별 광고 ROAS 비교", font: { size: 14, weight: "700" }, color: "#1e293b" }, legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: defaultGrid } } },
  });
}

function renderCharts(data, tab) {
  if (tab === "DASHBOARD") return;
  const dly = {};
  data.forEach((d) => {
    if (!dly[d.date]) dly[d.date] = { s: 0, r: 0 };
    dly[d.date].s += d.adSpend; dly[d.date].r += d.revenue;
  });
  const labels = Object.keys(dly).sort();
  
  chartInstances.line = new Chart(document.getElementById("lineChart"), {
    data: {
      labels,
      datasets: [
        { type: "bar", label: "광고비", data: labels.map((l) => dly[l].s), backgroundColor: "#94a3b8", yAxisID: "y", order: 2, borderRadius: 4, maxBarThickness: 32 },
        { type: "line", label: "광고 매출", data: labels.map((l) => dly[l].r), borderColor: "#3b82f6", backgroundColor: "#3b82f6", borderWidth: 2.5, yAxisID: "y1", pointRadius: 3, pointBackgroundColor: "#fff", tension: 0.3, order: 1 }
      ],
    },
    options: { 
      responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, 
      plugins: {
        legend: { labels: { usePointStyle: false, useBorderRadius: true, borderRadius: 3, boxWidth: 18, boxHeight: 6 } },
        tooltip: { callbacks: { label: function (context) { return context.dataset.label + ": ₩" + context.parsed.y.toLocaleString(); }, afterBody: function (context) { if (!context || context.length === 0) return ""; const l = context[0].label; const spd = dly[l].s; const rev = dly[l].r; const roas = spd > 0 ? ((rev / spd) * 100).toFixed(0) : 0; return `\n※ Ad ROAS: ${roas}%`; } } }
      },
      scales: { x: { grid: { display: false } }, y: { position: "left", grid: defaultGrid }, y1: { position: "right", grid: { display: false } } } 
    },
  });

  const pie = {};
  data.forEach((d) => { const k = tab === "TOTAL" ? d.platform : d.adName; pie[k] = (pie[k] || 0) + d.adSpend; });
  
  const groupedPieDataDetail = getReadablePieAggregation(pie, tab === "TOTAL" ? "기타 매체" : "기타 광고");
  const pieLabelsDetail = Object.keys(groupedPieDataDetail);
  const pieValuesDetail = Object.values(groupedPieDataDetail);

  chartInstances.pie = new Chart(document.getElementById("pieChart"), {
    type: "doughnut",
    data: { 
        labels: pieLabelsDetail, 
        datasets: [{ data: pieValuesDetail, backgroundColor: pieLabelsDetail.map(getConsistentColor), borderWidth: 0, borderRadius: pieLabelsDetail.length === 1 ? 0 : 8, spacing: pieLabelsDetail.length === 1 ? 0 : 4 }] 
    },
    options: { maintainAspectRatio: false, cutout: '70%', plugins: { title: { display: true, text: "광고비 비중", font: { size: 14, weight: "700" }, color: "#1e293b", padding: { bottom: 20 } }, legend: { position: "bottom", labels: { usePointStyle: true, padding: 16 } } } },
  });

  const uniqueAdsForChart = new Set();
  const adRevTrendData = {};
  
  data.forEach(d => {
      if (!adRevTrendData[d.date]) adRevTrendData[d.date] = {};
      const ad = tab === "TOTAL" ? d.platform : d.adName; 
      if (ad && ad !== "-") {
         adRevTrendData[d.date][ad] = (adRevTrendData[d.date][ad] || 0) + d.revenue;
         uniqueAdsForChart.add(ad);
      }
  });

  const adRevDatasets = [];
  uniqueAdsForChart.forEach(ad => {
      const color = getConsistentColor(ad); 
      const adData = labels.map(l => (adRevTrendData[l] && adRevTrendData[l][ad]) ? adRevTrendData[l][ad] : 0);
      
      adRevDatasets.push({
          type: "line",
          label: ad + " 매출",
          data: adData,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2.5,
          yAxisID: "y",
          pointRadius: labels.map((_, i) => (i === 0 || i === labels.length - 1) ? 3 : 0),
          pointHoverRadius: labels.map((_, i) => (i === 0 || i === labels.length - 1) ? 5 : 0),
          pointBackgroundColor: "#fff",
          tension: 0.3,
          segment: {
             borderColor: ctx => (ctx.p0.parsed.y === 0 && ctx.p1.parsed.y === 0) ? 'transparent' : undefined
          }
      });
  });

  if (document.getElementById("adRevTrendChart")) {
      chartInstances.adRevTrend = new Chart(document.getElementById("adRevTrendChart"), {
        data: {
          labels,
          datasets: adRevDatasets,
        },
        options: {
          responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
          plugins: { legend: { labels: { usePointStyle: false, useBorderRadius: true, borderRadius: 3, boxWidth: 18, boxHeight: 6 } }, tooltip: { callbacks: { label: function (context) { return context.dataset.label + ": ₩" + context.parsed.y.toLocaleString(); } } } },
          scales: { x: { grid: { display: false } }, y: { position: "left", grid: defaultGrid } }
        },
      });
  }
}

function renderTable(data) {
  let h = `<div class="table-wrapper"><table><colgroup><col style="width: 100px;"><col style="width: 80px;"><col style="width: 70px;"><col style="width: 60px;"><col style="width: 70px;"><col style="width: 80px;"><col style="width: 70px;"><col style="width: 60px;"><col style="width: 100px;"><col style="width: 60px;"><col style="width: 110px;"><col style="width: 60px;"><col style="width: 80px;"><col style="width: 70px;"></colgroup><tr><th>날짜</th><th>노출</th><th>클릭</th><th>CTR</th><th>CPC</th><th>View</th><th>CPV</th><th>VTR</th><th>광고비</th><th>전환</th><th>매출액</th><th>CR</th><th>CPS</th><th>ROAS</th></tr>`;
  const grp = {};
  data.forEach((d) => {
    if (!grp[d.date]) grp[d.date] = { imp: 0, clk: 0, view: 0, spd: 0, conv: 0, rev: 0 };
    grp[d.date].imp += d.impression; grp[d.date].clk += d.click; grp[d.date].view += d.view;
    grp[d.date].spd += d.adSpend; grp[d.date].conv += d.conversions; grp[d.date].rev += d.revenue;
  });
  Object.keys(grp).sort().forEach((dt) => {
      const m = calculateMetrics(grp[dt].imp, grp[dt].clk, grp[dt].view, grp[dt].spd, grp[dt].conv, grp[dt].rev);
      h += `<tr class="${getDayClass(dt)}"><td>${dt}</td><td>${grp[dt].imp.toLocaleString()}</td><td>${grp[dt].clk.toLocaleString()}</td><td>${m.ctr}%</td><td>${Number(m.cpc).toLocaleString()}</td><td>${grp[dt].view.toLocaleString()}</td><td>${Number(m.cpv).toLocaleString()}</td><td>${m.vtr}%</td><td style="font-weight:600;">${grp[dt].spd.toLocaleString()}</td><td>${grp[dt].conv.toLocaleString()}</td><td style="font-weight:600;">${grp[dt].rev.toLocaleString()}</td><td>${m.cr}%</td><td>${Number(m.cps).toLocaleString()}</td><td style="font-weight:600;">${m.roas}%</td></tr>`;
  });
  const t = aggregateData(data);
  h += `<tr class="row-total"><td>Total</td><td>${t.imp.toLocaleString()}</td><td>${t.clk.toLocaleString()}</td><td>${t.ctr}%</td><td>₩${Number(t.cpc).toLocaleString()}</td><td>${t.view.toLocaleString()}</td><td>${Number(t.cpv).toLocaleString()}</td><td>${t.vtr}%</td><td>${t.spd.toLocaleString()}</td><td>${t.conv.toLocaleString()}</td><td>${t.rev.toLocaleString()}</td><td>${t.cr}%</td><td>${Number(t.cps).toLocaleString()}</td><td>${t.roas}%</td></tr></table></div>`;
  document.getElementById("data-table").innerHTML = h;
}

function changeAdFilter(val) { currentAdFilter = val; renderTab(currentTab, true); }
function exportToExcel() {
  let base = currentTab === "TOTAL" ? currentData : currentData.filter((d) => d.platform === currentTab);
  let d = currentAdFilter === "ALL" ? base : base.filter((v) => v.adName === currentAdFilter);
  const excel = d.map((v) => {
    const m = calculateMetrics(v.impression, v.click, v.view, v.adSpend, v.conversions, v.revenue);
    return { 날짜: v.date, 매체: v.platform, 광고명: v.adName, 노출: v.impression, 클릭: v.click, 광고비: v.adSpend, 광고매출: v.revenue, "Ad ROAS": m.roas };
  });
  const ws = XLSX.utils.json_to_sheet(excel);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "성과");
  XLSX.writeFile(wb, `GENEF_리포트_${currentTab}.xlsx`);
}