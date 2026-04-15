import { createClient } from "@supabase/supabase-js";
import "./styles.css";

const SESSION_KEY = "tailorTryOnMvp.session.v3";
const STORAGE_BUCKET = "tailor-assets";
const REQUEST_TIMEOUT_MS = 12000;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const shareBaseUrl = import.meta.env.VITE_SHARE_BASE_URL;
const aiFreeQuota = Number(import.meta.env.VITE_AI_FREE_QUOTA || 200);
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const measurements = [
  ["height", "身高", "cm"],
  ["weight", "体重", "kg"],
  ["age", "年龄", "岁"],
  ["chest", "胸围", "cm"],
  ["waist", "腰围", "cm"],
  ["hip", "臀围", "cm"],
  ["shoulder", "肩宽", "cm"],
  ["sleeve", "袖长", "cm"],
  ["clothesLength", "衣长", "cm"],
  ["pantsLength", "裤长", "cm"],
  ["neck", "颈围", "cm"],
  ["wrist", "腕围", "cm"],
  ["armholeDepth", "袖笼深度", "cm"],
];

const photoSlots = [
  {
    key: "front",
    label: "正面全身照",
    required: true,
    hint: "必填。头到脚完整入镜，站直，双臂自然下垂，腰线不要被遮挡。",
  },
  {
    key: "side",
    label: "侧面全身照",
    required: false,
    hint: "推荐。身体侧对镜头，帮助判断胸腹、臀部和体态厚度。",
  },
  {
    key: "back",
    label: "背面全身照",
    required: false,
    hint: "推荐。背对镜头站直，帮助判断肩背、衣长和裤长比例。",
  },
  {
    key: "portrait",
    label: "半身形象照",
    required: false,
    hint: "选填。胸口以上清晰，帮助试穿效果更接近客户气质。",
  },
];

const tryOnAngles = [
  {
    key: "front",
    label: "正面",
    photoKey: "front",
    instruction: "正面全身试穿图，人物正面对镜头，保留原照片构图和站姿。",
  },
  {
    key: "side",
    label: "侧面",
    photoKey: "side",
    instruction: "侧面全身试穿图，人物侧面对镜头，重点展示胸腹、臀部、袖长和裤长比例。",
  },
  {
    key: "back",
    label: "背面",
    photoKey: "back",
    instruction: "背面全身试穿图，人物背面对镜头，重点展示肩背、后片衣长和短裤后侧比例。",
  },
];

const fallbackPlans = [
  {
    id: "moss-henley",
    title: "苔绿色亨利衫 + 烟灰短裤",
    material: "竹节棉混纺，微弹短裤",
    fit: "微宽松，肩线自然，裤长膝上",
    palette: ["#697f4d", "#7f837b"],
    image: "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "brick-henley",
    title: "砖红亨利衫 + 深青短裤",
    material: "洗旧棉，斜纹短裤",
    fit: "胸腰保留活动量，袖口略收",
    palette: ["#b95742", "#315f6e"],
    image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "oat-henley",
    title: "燕麦白亨利衫 + 灰绿短裤",
    material: "轻亚麻感棉，水洗短裤",
    fit: "清爽直身，适合夏季日常",
    palette: ["#e7dfd0", "#627665"],
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
  },
];

const sampleCustomerPhoto =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80";

const app = document.querySelector("#app");
const initialClient = makeLocalClient();

let state = {
  clients: [initialClient],
  plans: fallbackPlans,
  activeClientId: initialClient.id,
  activePlanId: fallbackPlans[0].id,
  activeAngle: "front",
  aiUsageCount: 0,
  loading: false,
  error: "",
  cloudReady: false,
};

let viewerState = {
  scale: 1,
  x: 0,
  y: 0,
  dragging: false,
  startX: 0,
  startY: 0,
};

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) ?? {};
  } catch {
    return {};
  }
}

function writeSession() {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      activeClientId: state.activeClientId,
      activePlanId: state.activePlanId,
      activeAngle: state.activeAngle,
    }),
  );
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeLocalClient() {
  return {
    id: "local-demo-client",
    shareCode: "local-demo-client",
    name: "陈先生",
    phone: "",
    photo: sampleCustomerPhoto,
    photoSet: {
      front: sampleCustomerPhoto,
    },
    measurements: {
      height: 178,
      weight: 74,
      age: 36,
      chest: 98,
      waist: 84,
      hip: 96,
      shoulder: 46,
      sleeve: 61,
      clothesLength: 70,
      pantsLength: 48,
      neck: 39,
      wrist: 17,
      armholeDepth: 24,
    },
    resultImages: {},
    feedback: {},
  };
}

function hashParams() {
  return Object.fromEntries(new URLSearchParams(window.location.hash.slice(1)));
}

function normalizePlan(row) {
  return {
    id: row.id,
    title: row.title,
    material: row.material ?? "",
    fit: row.fit ?? "",
    palette: [row.shirt_color ?? "#697f4d", row.shorts_color ?? "#7f837b"],
    image: row.image_url ?? "",
  };
}

function normalizeClient(row, results = [], feedback = []) {
  const photoSet = row.photo_set ?? {};
  if (!photoSet.front && row.photo_url) {
    photoSet.front = row.photo_url;
  }

  const resultImages = {};
  results
    .filter((item) => item.client_id === row.id)
    .forEach((item) => {
      const angle = item.angle ?? "front";
      resultImages[item.plan_id] = resultImages[item.plan_id] ?? {};
      resultImages[item.plan_id][angle] = item.image_url;
    });

  const feedbackByPlan = {};
  feedback
    .filter((item) => item.client_id === row.id)
    .forEach((item) => {
      feedbackByPlan[item.plan_id] = {
        decision: item.decision,
        note: item.note ?? "",
        updatedAt: item.updated_at,
      };
    });

  return {
    id: row.id,
    shareCode: row.share_code,
    name: row.name,
    phone: row.phone ?? "",
    photo: photoSet.front ?? row.photo_url ?? "",
    photoSet,
    measurements: row.measurements ?? {},
    resultImages,
    feedback: feedbackByPlan,
  };
}

async function fetchTable(table, query) {
  const { data, error } = await withTimeout(query, `${table} 连接超时，请检查手机是否能访问 Supabase 网络。`);
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
  return data ?? [];
}

function withTimeout(promise, message = "请求超时，请检查网络后重试。") {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), REQUEST_TIMEOUT_MS);
    }),
  ]);
}

async function loadRemoteData() {
  if (!supabase) {
    throw new Error("缺少 Supabase 环境变量，请检查 .env.local。");
  }

  const planRows = await fetchTable(
    "outfit_plans",
    supabase.from("outfit_plans").select("*").order("sort_order", { ascending: true }),
  );
  const clientRows = await fetchTable(
    "clients",
    supabase.from("clients").select("*").order("created_at", { ascending: false }),
  );
  const resultRows = await fetchTable("try_on_results", supabase.from("try_on_results").select("*"));
  const feedbackRows = await fetchTable("client_feedback", supabase.from("client_feedback").select("*"));
  const aiUsageCount = await fetchAiUsageCount();

  const session = readSession();
  state.plans = planRows.length ? planRows.map(normalizePlan) : fallbackPlans;
  state.clients = clientRows.map((row) => normalizeClient(row, resultRows, feedbackRows));
  state.activeClientId = clientRows.some((client) => client.id === session.activeClientId)
    ? session.activeClientId
    : state.clients[0]?.id ?? "";
  state.activePlanId = state.plans.some((plan) => plan.id === session.activePlanId)
    ? session.activePlanId
    : state.plans[0]?.id ?? "";
  state.activeAngle = tryOnAngles.some((angle) => angle.key === session.activeAngle) ? session.activeAngle : "front";
  state.aiUsageCount = aiUsageCount;
  state.error = "";
  state.cloudReady = true;
}

async function fetchAiUsageCount() {
  const { count, error } = await supabase.from("ai_generation_logs").select("id", {
    count: "exact",
    head: true,
  });
  if (error) {
    console.warn("AI usage count unavailable:", error.message);
    return state.aiUsageCount ?? 0;
  }
  return count ?? 0;
}

async function seedFirstClient() {
  if (state.clients.length || !supabase) return;
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: "陈先生",
      phone: "",
      photo_url: sampleCustomerPhoto,
      photo_set: {
        front: sampleCustomerPhoto,
      },
      measurements: {
        height: 178,
        weight: 74,
        age: 36,
        chest: 98,
        waist: 84,
        hip: 96,
        shoulder: 46,
        sleeve: 61,
        clothesLength: 70,
        pantsLength: 48,
        neck: 39,
        wrist: 17,
        armholeDepth: 24,
      },
    })
    .select()
    .single();
  if (error) throw new Error(`clients seed: ${error.message}`);
  state.clients = [normalizeClient(data)];
  state.activeClientId = data.id;
  writeSession();
}

async function bootstrap() {
  route();
  try {
    await loadRemoteData();
    await seedFirstClient();
  } catch (error) {
    state.error = error.message;
    state.cloudReady = false;
  } finally {
    state.loading = false;
    route();
  }
}

function activeClient() {
  return state.clients.find((client) => client.id === state.activeClientId);
}

function planById(id = state.activePlanId) {
  return state.plans.find((plan) => plan.id === id) ?? state.plans[0] ?? fallbackPlans[0];
}

function activeAngle() {
  return tryOnAngles.find((angle) => angle.key === state.activeAngle) ?? tryOnAngles[0];
}

function remainingAiQuota() {
  return Math.max(0, aiFreeQuota - (state.aiUsageCount || 0));
}

function aiQuotaMessage() {
  const remaining = remainingAiQuota();
  if (remaining > 0) {
    return `AI 免费生成剩余 ${remaining} 次，生成成功后扣减 1 次。`;
  }
  return "AI 免费额度已用完，本次生成将产生费用，请确认后再生成。";
}

function clientByShareCode(code) {
  return state.clients.find((client) => client.shareCode === code || client.id === code);
}

function shareUrl(client, planId) {
  const base = shareBaseUrl || window.location.origin;
  const url = new URL(base);
  url.hash = `view=client&client=${encodeURIComponent(client.shareCode)}&plan=${encodeURIComponent(planId)}`;
  return url.toString();
}

function safeFileName(file) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return `${Date.now()}-${createId()}.${extension}`;
}

async function uploadImage(file, folder) {
  if (!file || file.size === 0) return "";
  const path = `${folder}/${safeFileName(file)}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw new Error(`图片上传失败：${error.message}`);
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function setImage(node, src) {
  if (src) {
    node.src = src;
    node.hidden = false;
  } else {
    node.removeAttribute("src");
    node.hidden = true;
  }
}

function measurementValue(client, key, unit) {
  const value = client?.measurements?.[key];
  return value ? `${value}${unit}` : "待补充";
}

function renderPhotoUploadSlots(client) {
  return photoSlots
    .map((slot) => {
      const src = client?.photoSet?.[slot.key] ?? "";
      return `
        <label class="photo-slot ${slot.required ? "required" : ""}">
          <span>${slot.label}${slot.required ? " *" : ""}</span>
          <small>${slot.hint}</small>
          <input name="photo_${slot.key}" type="file" accept="image/*">
          <div class="photo-thumb">
            <img src="${src}" alt="${slot.label}" ${src ? "" : "hidden"}>
            <em ${src ? "hidden" : ""}>待上传</em>
          </div>
        </label>
      `;
    })
    .join("");
}

function renderMeasurements(client, compact = false) {
  const items = compact ? measurements.slice(0, 8) : measurements;
  return items
    .map(
      ([key, label, unit]) => `
        <div class="metric">
          <dt>${label}</dt>
          <dd>${measurementValue(client, key, unit)}</dd>
        </div>
      `,
    )
    .join("");
}

function renderLoading() {
  app.innerHTML = `
    <main class="loading-shell">
      <div class="panel">
        <p class="loading-text">正在连接裁缝工作台...</p>
        <span class="loading-help">如果手机长时间停在这里，请确认手机网络能访问 Supabase，或切换浏览器刷新重试。</span>
      </div>
    </main>
  `;
}

function renderSetupError() {
  app.innerHTML = `
    ${renderTopbar("studio")}
    <main class="client-shell">
      <section class="panel setup-error">
        <p>连接没有完成</p>
        <h1>请刷新或检查网络</h1>
        <span>如果电脑正常、手机一直卡住，通常是手机网络访问 Supabase 过慢或被拦截。你可以先换浏览器/网络重试；后续部署公网时我们会换成更稳定的访问方式。</span>
        <pre>${state.error}</pre>
        <button type="button" id="retryButton">重新连接</button>
      </section>
    </main>
  `;
  document.querySelector("#retryButton").addEventListener("click", () => {
    state = { ...state, loading: true, error: "" };
    bootstrap();
  });
}

function renderTopbar(mode) {
  if (mode === "client") {
    return `
      <header class="topbar client-topbar">
        <a class="brand" href="#view=client" aria-label="客户试穿确认页">
          <span>衡衣间</span>
          <small>定制方案确认</small>
        </a>
      </header>
    `;
  }

  return `
    <header class="topbar">
      <a class="brand" href="#view=studio" aria-label="返回裁缝后台">
        <span>衡衣间</span>
        <small>个人裁缝定制工具</small>
      </a>
      <nav>
        <a class="${mode === "studio" ? "active" : ""}" href="#view=studio">裁缝后台</a>
      </nav>
    </header>
  `;
}

function applyTryOn(stage, client, plan) {
  const customerPhoto = stage.querySelector("[data-customer-photo]");
  const resultPhoto = stage.querySelector("[data-result-photo]");
  const hint = stage.querySelector("[data-stage-hint]");
  const shirt = stage.querySelector("[data-shirt]");
  const shorts = stage.querySelector("[data-shorts]");
  const angle = activeAngle();
  const sourcePhoto = client?.photoSet?.[angle.photoKey] ?? (angle.key === "front" ? client?.photo : "");
  const result = client?.resultImages?.[plan.id]?.[angle.key] ?? "";

  shirt.style.background = plan.palette[0];
  shorts.style.background = plan.palette[1];
  setImage(customerPhoto, sourcePhoto ?? "");
  setImage(resultPhoto, result);
  stage.dataset.viewerSrc = result || sourcePhoto || "";
  stage.dataset.viewerTitle = result
    ? `${client?.name ?? "客户"} - ${plan.title} ${angle.label} AI 试穿图`
    : `${client?.name ?? "客户"} - ${angle.label}原始照片预览`;
  stage.classList.toggle("has-customer", Boolean(sourcePhoto));
  stage.classList.toggle("has-result", Boolean(result));
  stage.classList.toggle("front-angle", angle.key === "front");
  hint.textContent = result
    ? `当前显示${angle.label} AI 试穿效果图。`
    : sourcePhoto
      ? `当前为${angle.label}方案预览位，可生成或上传 AI 试穿图替换。`
      : `请先上传客户${angle.label}全身照并保存到云端。`;
}

function tryOnStageMarkup(label) {
  return `
    <div class="tryon-stage" data-tryon-stage>
      <img data-customer-photo alt="${label}客户照片">
      <div class="garment-preview" aria-hidden="true">
        <div class="shirt-shape" data-shirt></div>
        <div class="shorts-shape" data-shorts></div>
      </div>
      <img data-result-photo alt="${label}试穿效果图">
      <p data-stage-hint></p>
    </div>
  `;
}

function renderStudio() {
  const client = activeClient();
  const plan = planById();
  const feedback = client?.feedback?.[plan.id];

  app.innerHTML = `
    ${renderTopbar("studio")}
    <main class="studio-shell">
      <aside class="panel customer-editor">
        <div class="section-title">
          <p>客户档案</p>
          <h1>量体与照片</h1>
        </div>
        <p class="cloud-status ${state.cloudReady ? "ready" : "offline"}">
          ${state.cloudReady ? "云端已连接，保存后手机可同步。" : `正在使用本地演示数据。云端连接未完成：${state.error || "正在连接..."}`}
        </p>
        <form id="clientForm" class="form-grid">
          <p class="form-error" id="formError" hidden></p>
          <label>客户姓名<input name="name" value="${client?.name ?? ""}" placeholder="例如：陈先生" required></label>
          <label>联系方式<input name="phone" value="${client?.phone ?? ""}" placeholder="手机或微信"></label>
          <section class="photo-upload-panel" aria-label="客户照片上传要求">
            <div class="photo-upload-title">
              <strong>客户照片</strong>
              <span>建议穿贴身浅色衣物，背景干净，光线均匀，手机放在胸口到腰部高度，避免广角畸变。</span>
            </div>
            <div class="photo-slot-grid">
              ${renderPhotoUploadSlots(client)}
            </div>
          </section>
          <div class="measure-grid">
            ${measurements
              .map(([key, label, unit]) => `<label>${label}<input name="${key}" type="number" min="0" value="${client?.measurements?.[key] ?? ""}" placeholder="${unit}"></label>`)
              .join("")}
          </div>
          <button type="submit">保存到云端</button>
          <button class="ghost" id="newClientButton" type="button">新建客户</button>
        </form>
      </aside>

      <section class="studio-main">
        <section class="panel overview">
          <div class="section-title">
            <p>男式休闲风</p>
            <h2>亨利衫与短裤方案</h2>
          </div>
          <div class="plan-grid">
            ${state.plans.map((item) => renderPlanCard(item)).join("")}
          </div>
        </section>

        <section class="workbench">
          <article class="panel client-card">
            <div class="section-title">
              <p>当前客户</p>
              <h2>${client?.name ?? "尚未保存客户"}</h2>
            </div>
            <div class="portrait">
              <img src="${client?.photo ?? ""}" alt="客户照片" ${client?.photo ? "" : "hidden"}>
              <span ${client?.photo ? "hidden" : ""}>上传客户照片</span>
            </div>
            <dl class="metric-list">${renderMeasurements(client, true)}</dl>
            <div class="feedback-chip ${feedback?.decision ?? ""}">
              <strong>客户反馈</strong>
              <span>${studioFeedbackText(feedback)}</span>
            </div>
          </article>

          <article class="panel tryon-card">
            <div class="section-title split">
              <div>
                <p>试穿展示</p>
                <h2>${plan.title} · ${activeAngle().label}</h2>
              </div>
              <div class="tryon-actions">
                <button id="generateTryOnButton" type="button">生成${activeAngle().label} AI 图</button>
                <label class="result-upload">上传效果图<input id="resultUpload" type="file" accept="image/*"></label>
              </div>
            </div>
            ${renderAngleTabs()}
            ${tryOnStageMarkup("裁缝后台")}
            <p class="ai-status" id="aiStatus" hidden></p>
            <p class="ai-quota ${remainingAiQuota() === 0 ? "paid" : ""}">${aiQuotaMessage()}</p>
            <div class="preview-note">
              <strong>当前预览</strong>
              <span>先选择正面、侧面或背面角度，再生成对应 AI 试穿图。上传效果图会覆盖当前角度。</span>
            </div>
            <div class="share-row">
              <button id="copyShareButton" type="button">复制客户链接</button>
              <a class="open-client-link ${client ? "" : "disabled"}" href="${client ? shareUrl(client, plan.id) : "#"}" target="_blank" rel="noreferrer">打开客户页</a>
              <input id="shareInput" readonly value="${client ? shareUrl(client, plan.id) : ""}" placeholder="保存客户后生成链接">
            </div>
            <p class="share-hint">复制后可直接发给客户。客户页只展示当前方案、试穿效果和确认入口。</p>
          </article>
        </section>
      </section>
    </main>
  `;

  document.querySelectorAll("[data-plan-id]").forEach((card) => {
    card.classList.toggle("selected", card.dataset.planId === plan.id);
    card.addEventListener("click", () => {
      state.activePlanId = card.dataset.planId;
      writeSession();
      renderStudio();
    });
  });
  wireAngleTabs(renderStudio);

  document.querySelector("#clientForm").addEventListener("submit", saveClientFromForm);
  document.querySelector("#newClientButton").addEventListener("click", () => {
    state.activeClientId = "";
    writeSession();
    renderStudio();
  });
  document.querySelector("#generateTryOnButton").addEventListener("click", generateTryOnImage);
  document.querySelector("#resultUpload").addEventListener("change", uploadResultImage);
  document.querySelector("#copyShareButton").addEventListener("click", copyShareLink);
  applyTryOn(document.querySelector("[data-tryon-stage]"), client, plan);
  wireTryOnViewer();
}

function renderAngleTabs() {
  return `
    <div class="angle-tabs" role="tablist" aria-label="试穿角度">
      ${tryOnAngles
        .map(
          (angle) => `
            <button class="${angle.key === state.activeAngle ? "active" : ""}" type="button" data-angle="${angle.key}">
              ${angle.label}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function wireAngleTabs(afterChange) {
  document.querySelectorAll("[data-angle]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeAngle = button.dataset.angle;
      writeSession();
      afterChange();
    });
  });
}

function renderPlanCard(plan) {
  return `
    <article class="plan-card" data-plan-id="${plan.id}">
      <img src="${plan.image}" alt="${plan.title}">
      <div>
        <h3>${plan.title}</h3>
        <p>${plan.material}</p>
        <small>${plan.fit}</small>
      </div>
    </article>
  `;
}

function studioFeedbackText(feedback) {
  if (!feedback?.decision) return "客户还没有提交确认。";
  if (feedback.decision === "approved") return feedback.note ? `已确认：${feedback.note}` : "客户已确认这个方向。";
  return feedback.note ? `需要修改：${feedback.note}` : "客户希望修改。";
}

function showFormError(message) {
  const errorNode = document.querySelector("#formError");
  if (!errorNode) {
    alert(message);
    return;
  }
  errorNode.textContent = message;
  errorNode.hidden = false;
}

async function saveClientFromForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector("button[type='submit']");
  submitButton.textContent = "保存中...";
  submitButton.disabled = true;

  try {
    document.querySelector("#formError").hidden = true;
    const data = new FormData(form);
    const existing = activeClient();
    const photoSet = { ...(existing?.photoSet ?? {}) };
    for (const slot of photoSlots) {
      const uploaded = await uploadImage(data.get(`photo_${slot.key}`), `customers/${slot.key}`);
      if (uploaded) photoSet[slot.key] = uploaded;
    }
    const payload = {
      name: data.get("name") || "未命名客户",
      phone: data.get("phone") || "",
      photo_url: photoSet.front || existing?.photo || sampleCustomerPhoto,
      photo_set: photoSet,
      measurements: Object.fromEntries(measurements.map(([key]) => [key, data.get(key)])),
    };

    const query = existing
      ? supabase.from("clients").update(payload).eq("id", existing.id).select().single()
      : supabase.from("clients").insert(payload).select().single();
    const { data: saved, error } = await query;
    if (error) throw new Error(`保存客户失败：${error.message}`);

    state.activeClientId = saved.id;
    writeSession();
    await loadRemoteData();
    renderStudio();
  } catch (error) {
    showFormError(error.message);
  } finally {
    submitButton.textContent = "保存到云端";
    submitButton.disabled = false;
  }
}

async function uploadResultImage(event) {
  const client = activeClient();
  if (!client) return;

  try {
    const imageUrl = await uploadImage(event.target.files[0], "try-on-results");
    if (!imageUrl) return;
    const { error } = await supabase.from("try_on_results").upsert(
      {
        client_id: client.id,
        plan_id: state.activePlanId,
        angle: state.activeAngle,
        image_url: imageUrl,
        source: "manual_upload",
        status: "ready",
      },
      { onConflict: "client_id,plan_id,angle" },
    );
    if (error) throw new Error(`保存效果图失败：${error.message}`);
    await loadRemoteData();
    renderStudio();
  } catch (error) {
    showFormError(error.message);
  }
}

async function generateTryOnImage() {
  const client = activeClient();
  const plan = planById();
  const angle = activeAngle();
  const button = document.querySelector("#generateTryOnButton");
  const status = document.querySelector("#aiStatus");
  const personImageUrl = client?.photoSet?.[angle.photoKey] ?? (angle.key === "front" ? client?.photo : "");

  if (!personImageUrl) {
    status.hidden = false;
    status.textContent = `请先上传客户${angle.label}全身照并保存到云端。`;
    status.className = "ai-status error";
    return;
  }

  button.disabled = true;
  button.textContent = `${angle.label}生成中...`;
  status.hidden = false;
  status.textContent = `${aiQuotaMessage()} 正在调用 Seedream 4.5 生成${angle.label}试穿图，可能需要几十秒。`;
  status.className = "ai-status";

  try {
    const response = await fetch("/api/generate-tryon", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        clientName: client.name,
        personImageUrl,
        angle: angle.key,
        angleLabel: angle.label,
        angleInstruction: angle.instruction,
        planTitle: plan.title,
        material: plan.material,
        fit: plan.fit,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error || "AI 试穿图生成失败");
    }

    const { error } = await supabase.from("try_on_results").upsert(
      {
        client_id: client.id,
        plan_id: state.activePlanId,
        angle: state.activeAngle,
        image_url: result.imageUrl,
        source: "seedream_4_5",
        status: "ready",
      },
      { onConflict: "client_id,plan_id,angle" },
    );
    if (error) throw new Error(`保存 AI 效果图失败：${error.message}`);

    await supabase.from("ai_generation_logs").insert({
      client_id: client.id,
      plan_id: state.activePlanId,
      angle: state.activeAngle,
      provider: "volcengine",
      model: result.model || "doubao-seedream-4-5-251128",
      image_url: result.imageUrl,
    });

    status.textContent = `${angle.label} AI 试穿图已生成并保存。`;
    status.className = "ai-status success";
    await loadRemoteData();
    renderStudio();
  } catch (error) {
    status.textContent = error.message;
    status.className = "ai-status error";
  } finally {
    button.disabled = false;
    button.textContent = `生成${angle.label} AI 图`;
  }
}

async function copyShareLink() {
  const input = document.querySelector("#shareInput");
  if (!input.value) return;
  const button = document.querySelector("#copyShareButton");
  try {
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(input.value);
    } else {
      const copied = document.execCommand("copy");
      if (!copied) throw new Error("copy command failed");
    }
    button.textContent = "已复制，可发给客户";
    setTimeout(() => {
      button.textContent = "复制客户链接";
    }, 1400);
  } catch {
    button.textContent = "请长按下方链接复制";
    input.removeAttribute("readonly");
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);
    setTimeout(() => input.setAttribute("readonly", "readonly"), 600);
  }
}

function renderClientView() {
  const params = hashParams();
  const client = clientByShareCode(params.client) ?? activeClient();
  const plan = planById(params.plan);
  const feedback = client?.feedback?.[plan.id] ?? {};

  app.innerHTML = `
    ${renderTopbar("client")}
    <main class="client-shell">
      <section class="client-intro">
        <p>试穿确认页</p>
        <h1>${client ? `${client.name}的休闲定制方案` : "你的休闲定制方案"}</h1>
        <span>请查看整体比例、颜色和风格方向，确认后裁缝会继续细化面料、版型和工艺。</span>
      </section>
      <section class="client-layout">
        <article class="client-stage-panel">
          ${tryOnStageMarkup("客户")}
        </article>
        <article class="panel decision-panel">
          <div class="section-title">
            <p>当前方案</p>
            <h2>${plan.title} · ${activeAngle().label}</h2>
          </div>
          <div class="plan-detail">
            <span>${plan.material}</span>
            <span>${plan.fit}</span>
          </div>
          <div class="client-guidance">
            <strong>确认重点</strong>
            <span>先看上身感觉、颜色气质、衣长裤长比例。细节尺寸会由裁缝按量体数据继续调整。</span>
          </div>
          ${renderAngleTabs()}
          <dl class="metric-list client-metrics">${renderClientMeasurements(client)}</dl>
          <textarea id="clientNote" placeholder="想调整颜色、衣长、袖长、裤长或松量，可以写在这里。">${feedback.note ?? ""}</textarea>
          <div class="decision-actions">
            <button id="approveButton" type="button">确认这个方向</button>
            <button id="reviseButton" class="ghost" type="button">需要修改</button>
          </div>
          <p class="status-line" id="feedbackStatus">${statusText(feedback.decision)}</p>
        </article>
      </section>
    </main>
  `;

  applyTryOn(document.querySelector("[data-tryon-stage]"), client, plan);
  wireTryOnViewer();
  wireAngleTabs(renderClientView);
  document.querySelector("#approveButton").addEventListener("click", () => saveFeedback(client, plan.id, "approved"));
  document.querySelector("#reviseButton").addEventListener("click", () => saveFeedback(client, plan.id, "revise"));
}

function wireTryOnViewer() {
  document.querySelectorAll("[data-tryon-stage]").forEach((stage) => {
    stage.addEventListener("click", () => {
      if (!stage.dataset.viewerSrc) return;
      openImageViewer(stage.dataset.viewerSrc, stage.dataset.viewerTitle || "试穿效果图");
    });
  });
}

function openImageViewer(src, title) {
  closeImageViewer();
  viewerState = {
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    startX: 0,
    startY: 0,
  };

  const viewer = document.createElement("section");
  viewer.className = "image-viewer";
  viewer.innerHTML = `
    <div class="image-viewer-toolbar">
      <strong>${title}</strong>
      <div class="image-viewer-actions">
        <button type="button" data-zoom-out>缩小</button>
        <button type="button" data-zoom-reset>还原</button>
        <button type="button" data-zoom-in>放大</button>
        <a href="${src}" download target="_blank" rel="noreferrer">下载</a>
      </div>
    </div>
    <button class="image-viewer-close" type="button" aria-label="关闭">×</button>
    <div class="image-viewer-canvas">
      <img src="${src}" alt="${title}" draggable="false">
    </div>
  `;
  document.body.append(viewer);
  document.body.classList.add("viewer-open");

  const img = viewer.querySelector("img");
  const canvas = viewer.querySelector(".image-viewer-canvas");

  function updateTransform() {
    img.style.transform = `translate(${viewerState.x}px, ${viewerState.y}px) scale(${viewerState.scale})`;
  }

  function zoom(delta) {
    viewerState.scale = Math.min(5, Math.max(0.5, Number((viewerState.scale + delta).toFixed(2))));
    updateTransform();
  }

  viewer.querySelector(".image-viewer-close").addEventListener("click", closeImageViewer);
  viewer.querySelector("[data-zoom-in]").addEventListener("click", () => zoom(0.25));
  viewer.querySelector("[data-zoom-out]").addEventListener("click", () => zoom(-0.25));
  viewer.querySelector("[data-zoom-reset]").addEventListener("click", () => {
    viewerState.scale = 1;
    viewerState.x = 0;
    viewerState.y = 0;
    updateTransform();
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoom(event.deltaY > 0 ? -0.18 : 0.18);
  });

  canvas.addEventListener("pointerdown", (event) => {
    viewerState.dragging = true;
    viewerState.startX = event.clientX - viewerState.x;
    viewerState.startY = event.clientY - viewerState.y;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!viewerState.dragging) return;
    viewerState.x = event.clientX - viewerState.startX;
    viewerState.y = event.clientY - viewerState.startY;
    updateTransform();
  });

  canvas.addEventListener("pointerup", () => {
    viewerState.dragging = false;
  });

  canvas.addEventListener("pointercancel", () => {
    viewerState.dragging = false;
  });

  document.addEventListener("keydown", handleViewerKeydown);
  updateTransform();
}

function closeImageViewer() {
  document.querySelector(".image-viewer")?.remove();
  document.body.classList.remove("viewer-open");
  document.removeEventListener("keydown", handleViewerKeydown);
}

function handleViewerKeydown(event) {
  if (event.key === "Escape") closeImageViewer();
}

function renderClientMeasurements(client) {
  const keys = ["height", "weight", "chest", "waist", "shoulder", "clothesLength", "pantsLength", "sleeve"];
  return measurements
    .filter(([key]) => keys.includes(key))
    .map(
      ([key, label, unit]) => `
        <div class="metric">
          <dt>${label}</dt>
          <dd>${measurementValue(client, key, unit)}</dd>
        </div>
      `,
    )
    .join("");
}

function statusText(decision) {
  if (decision === "approved") return "已记录：客户确认这个方向。";
  if (decision === "revise") return "已记录：客户希望修改。";
  return "";
}

async function saveFeedback(client, planId, decision) {
  if (!client) return;
  const note = document.querySelector("#clientNote").value;
  const { error } = await supabase.from("client_feedback").upsert(
    {
      client_id: client.id,
      plan_id: planId,
      decision,
      note,
    },
    { onConflict: "client_id,plan_id" },
  );
  if (error) {
    alert(`保存反馈失败：${error.message}`);
    return;
  }
  await loadRemoteData();
  document.querySelector("#feedbackStatus").textContent = statusText(decision);
  document.querySelector("#feedbackStatus").classList.add("saved");
}

function route() {
  if (state.loading) {
    renderLoading();
    return;
  }
  if (state.error && state.clients.length === 0) {
    renderSetupError();
    return;
  }
  const params = hashParams();
  if (params.view === "client" || params.client) renderClientView();
  else renderStudio();
}

window.addEventListener("hashchange", route);
bootstrap();
