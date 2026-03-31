import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import {
  User,
  CreditCard,
  Activity,
  Clock,
  LogOut,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  Smartphone,
  Bitcoin,
  QrCode,
  Upload,
} from "lucide-react";
import { getPublicConfig, lookupClient, createOrder, checkOrderStatus, verifyCryptoPayment, getPlans, getOrders, getExchangeRates } from "@/lib/api";

interface PublicConfig {
  price_month: number;
  price_quarter: number;
  price_year: number;
  price_exclusive_month: number;
  price_exclusive_quarter: number;
  price_exclusive_year: number;
  price_shared_month: number;
  price_shared_quarter: number;
  price_shared_year: number;
  hupi_wechat: boolean;
  hupi_alipay: boolean;
  crypto_usdt: boolean;
  crypto_trx: boolean;
  crypto_address: string | null;
}

interface ClientData {
  expiryDate: number;
  trafficUsed: number;
  trafficTotal: number;
  email?: string;
}

interface PlanItem {
  id: string;
  title: string;
  category: string;
  duration_months: number;
  duration_days: number;
  price: number;
  description: string;
  sort_order: number;
  featured: boolean;
  enabled: boolean;
}

function parseVideoEmbed(raw: string): string {
  if (!raw || !raw.trim()) return "";
  const s = raw.trim();
  // Already an iframe
  if (s.startsWith("<iframe")) return s;
  // YouTube
  const ytMatch = s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:12px;"></iframe>`;
  // Bilibili
  const biliMatch = s.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
  if (biliMatch) return `<iframe src="https://player.bilibili.com/player.html?bvid=${biliMatch[1]}&high_quality=1" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:12px;"></iframe>`;
  // Direct video link
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(s)) return `<video src="${s}" controls style="width:100%;border-radius:12px;"></video>`;
  // Fallback: treat as iframe src
  if (s.startsWith("http")) return `<iframe src="${s}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:12px;"></iframe>`;
  return "";
}

export default function ClientPortal() {
  const [logged, setLogged] = useState(false);
  const [uuid, setUuid] = useState("");
  const [loginInput, setLoginInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [payStatus, setPayStatus] = useState<string | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [clientData, setClientData] = useState<ClientData>({
    expiryDate: Date.now() + 5 * 86400000,
    trafficUsed: 0,
    trafficTotal: 100,
  });
  const [dynamicPlans, setDynamicPlans] = useState<PlanItem[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{ months: number; price: number; planName: string } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [cryptoPrice, setCryptoPrice] = useState(0);
  const [exchangeRates, setExchangeRates] = useState<{ usdtCny: number; trxCny: number } | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [qrStatus, setQrStatus] = useState("");
  const [orderId, setOrderId] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [payUrl, setPayUrl] = useState("");
  const [orderCreating, setOrderCreating] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [videoEmbed, setVideoEmbed] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPublicConfig()
      .then(setConfig)
      .catch(() => {});
    getPlans()
      .then(setDynamicPlans)
      .catch(() => {});
    // Fetch video embed
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from("admin_config").select("video_embed").limit(1).single().then(({ data }) => {
        if (data?.video_embed) setVideoEmbed(data.video_embed);
      });
    });
    // Load jsQR
    if (!(window as any).jsQR) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  const extractIdentifier = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    // Try each line (user may paste multi-line content)
    const lines = trimmed.split(/\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (uuidRegex.test(line)) return line;
      try {
        if (line.startsWith("vless://") || line.startsWith("trojan://")) {
          const extracted = line.split("://")[1].split("@")[0];
          if (uuidRegex.test(extracted)) return extracted;
        } else if (line.startsWith("vmess://")) {
          const decoded = atob(line.substring(8));
          const json = JSON.parse(decoded);
          if (json?.id && uuidRegex.test(json.id)) return json.id;
        }
      } catch {}
    }
    // For SOCKS5: use the first non-empty line as identifier
    const firstLine = lines[0];
    if (firstLine && firstLine.length <= 256) return firstLine;
    return null;
  };

  const processImageFile = (file: File) => {
    setQrStatus("正在解析中...");
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const jsQR = (window as any).jsQR;
        if (jsQR) {
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            setLoginInput(code.data);
            setQrStatus("✅ 解析成功");
          } else {
            setQrStatus("❌ 未识别到二维码");
          }
        } else {
          setQrStatus("⏳ 识别组件加载中，请重试");
        }
        setTimeout(() => setQrStatus(""), 2500);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processImageFile(file);
        break;
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const extracted = extractIdentifier(loginInput);
    if (!extracted) {
      setError("请输入 UUID、节点链接或 SOCKS5 用户名/密码。");
      return;
    }
    setUuid(extracted);
    setLoading(true);
    setError("");
    try {
      const res = await lookupClient(extracted);
      if (res?.success) {
        setClientData({
          expiryDate: res.expiryDate || Date.now() + 30 * 86400000,
          trafficUsed: res.trafficUsed ?? 0,
          trafficTotal: res.trafficTotal ?? 100,
          email: res.email || "",
        });
        setLogged(true);
      } else {
        setError(res?.error || "未找到该 UUID 对应的节点");
      }
    } catch {
      setError("查询失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const getDaysLeft = () => Math.max(0, Math.ceil((clientData.expiryDate - Date.now()) / 86400000));

  const cleanupPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  useEffect(() => () => cleanupPolling(), []);

  const initiateCheckout = (months: number, price: number, planName: string) => {
    cleanupPolling();
    setCheckoutData({ months, price, planName });
    setSelectedMethod("");
    setPayStatus(null);
    setOrderId("");
    setQrCodeUrl("");
    setPayUrl("");
    setCountdown(0);
    setTab("checkout");
  };

  const handleSelectCrypto = async (method: string) => {
    setSelectedMethod(method);
    if (!checkoutData) return;

    // Fetch exchange rates if not cached
    if (!exchangeRates) {
      setRatesLoading(true);
      try {
        const rates = await getExchangeRates();
        if (rates?.usdtCny && rates?.trxCny) {
          setExchangeRates({ usdtCny: rates.usdtCny, trxCny: rates.trxCny });
          const rate = method === "usdt" ? rates.usdtCny : rates.trxCny;
          const converted = checkoutData.price / rate;
          // Add small random offset for unique amount matching
          const rand = (Math.floor(Math.random() * 10) + 10) / 10000;
          setCryptoPrice(Number((converted + rand).toFixed(4)));
        } else {
          // Fallback: use price directly with offset
          const rand = (Math.floor(Math.random() * 10) + 10) / 10000;
          setCryptoPrice(Number((checkoutData.price + rand).toFixed(4)));
        }
      } catch {
        const rand = (Math.floor(Math.random() * 10) + 10) / 10000;
        setCryptoPrice(Number((checkoutData.price + rand).toFixed(4)));
      } finally {
        setRatesLoading(false);
      }
    } else {
      const rate = method === "usdt" ? exchangeRates.usdtCny : exchangeRates.trxCny;
      const converted = checkoutData.price / rate;
      const rand = (Math.floor(Math.random() * 10) + 10) / 10000;
      setCryptoPrice(Number((converted + rand).toFixed(4)));
    }
  };

  const startPolling = (oid: string, isCrypto: boolean) => {
    setCountdown(1200); // 20 minutes
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          cleanupPolling();
          setPayStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        if (isCrypto) {
          const res = await verifyCryptoPayment(oid);
          if (res?.success && (res.status === "fulfilled" || res.status === "paid_unfulfilled")) {
            cleanupPolling();
            setPayStatus("success");
            if (checkoutData) {
              const newExpiry = new Date(clientData.expiryDate);
              newExpiry.setDate(newExpiry.getDate() + checkoutData.months * 30);
              setClientData({ ...clientData, trafficUsed: 0, expiryDate: newExpiry.getTime() });
            }
          }
        } else {
          const res = await checkOrderStatus(oid);
          if (res?.status === "fulfilled") {
            cleanupPolling();
            setPayStatus("success");
            if (checkoutData) {
              const newExpiry = new Date(clientData.expiryDate);
              newExpiry.setDate(newExpiry.getDate() + checkoutData.months * 30);
              setClientData({ ...clientData, trafficUsed: 0, expiryDate: newExpiry.getTime() });
            }
          } else if (res?.status === "paid_unfulfilled") {
            cleanupPolling();
            setPayStatus("paid_unfulfilled");
          }
        }
      } catch {}
    }, 5000);
  };

  const confirmPayment = async () => {
    if (!checkoutData || !selectedMethod) return;
    setOrderCreating(true);
    setPayStatus("creating");
    try {
      const isCrypto = ["usdt", "trx"].includes(selectedMethod);
      const res = await createOrder({
        uuid,
        planName: checkoutData.planName,
        months: checkoutData.months,
        amount: checkoutData.price,
        paymentMethod: selectedMethod,
        ...(isCrypto ? { cryptoAmount: cryptoPrice, cryptoCurrency: selectedMethod.toUpperCase() } : {}),
      });

      if (res?.orderId) {
        setOrderId(res.orderId);
        if (!isCrypto && res.qrCode) {
          setQrCodeUrl(res.qrCode);
        }
        if (!isCrypto && res.payUrl) {
          setPayUrl(res.payUrl);
        }
        setPayStatus("waiting");
        startPolling(res.orderId, isCrypto);
      } else {
        setPayStatus("error");
        setError(res?.error || "创建订单失败");
      }
    } catch (err: any) {
      setPayStatus("error");
      setError(err?.message || "创建订单失败");
    } finally {
      setOrderCreating(false);
    }
  };

  const handleCryptoVerify = async () => {
    if (!orderId) return;
    setPayStatus("verifying");
    try {
      const res = await verifyCryptoPayment(orderId);
      if (res?.success && (res.status === "fulfilled" || res.status === "paid_unfulfilled")) {
        cleanupPolling();
        setPayStatus("success");
        if (checkoutData) {
          const newExpiry = new Date(clientData.expiryDate);
          newExpiry.setDate(newExpiry.getDate() + checkoutData.months * 30);
          setClientData({ ...clientData, trafficUsed: 0, expiryDate: newExpiry.getTime() });
        }
      } else {
        setPayStatus("waiting");
        setError(res?.message || "暂未检测到转账，请稍后再试");
        setTimeout(() => setError(""), 3000);
      }
    } catch {
      setPayStatus("waiting");
      setError("验证失败，请稍后重试");
      setTimeout(() => setError(""), 3000);
    }
  };

  const formatCountdown = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // Login screen
  const videoHtml = useMemo(() => parseVideoEmbed(videoEmbed), [videoEmbed]);

  if (!logged) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted p-4 relative">
        <Link to="/" className="absolute top-4 left-4 text-2xl font-extrabold text-client-primary hover:opacity-80 transition-opacity">首页</Link>
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className={`flex items-stretch gap-6 w-full ${videoHtml ? 'max-w-4xl flex-col md:flex-row' : 'max-w-md flex-col'}`}>
          {/* Login card */}
          <div className={`bg-card rounded-2xl shadow-xl overflow-hidden ${videoHtml ? 'md:w-1/2 w-full' : 'w-full'}`}>
            <div className="bg-client-primary p-8 text-center">
              <User className="w-16 h-16 text-client-primary-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-client-primary-foreground mb-2">节点自助服务中心</h1>
              <p className="text-client-primary-foreground/80 text-sm">支持直接粘贴链接 或 扫码识别</p>
            </div>
            <div className="p-8">
              <form onSubmit={handleLogin}>
                <div className="relative mb-6">
                  <textarea
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={
                      "例如: 550e8400-e29b-41d4...\n或者粘贴完整的 vmess:// / vless:// 链接\n支持 SOCKS5 用户名或密码\n🌟 支持直接在此处 Ctrl+V 粘贴二维码截图"
                    }
                    className="w-full px-4 py-3 rounded-lg border border-input focus:ring-2 focus:ring-client-primary focus:border-transparent outline-none min-h-[120px] resize-none pb-12 bg-background text-foreground"
                    required
                  />
                  <div className="absolute bottom-3 right-3 flex items-center space-x-3">
                    {qrStatus && <span className="text-xs font-bold text-client-primary animate-pulse">{qrStatus}</span>}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center shadow-sm border border-border hover:opacity-90"
                    >
                      <Upload className="w-4 h-4 mr-1.5" />
                      扫码/传图
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) processImageFile(f);
                        e.target.value = "";
                      }}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
                {error && <p className="text-destructive text-sm mb-4">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-client-primary hover:opacity-90 text-client-primary-foreground font-bold py-3 rounded-lg transition-colors shadow-lg"
                >
                  {loading ? "智能解析并登录..." : "解析登录"}
                </button>
              </form>
            </div>
          </div>
          {/* Video panel */}
          {videoHtml && (
            <div className="md:w-1/2 w-full flex items-center">
              <div className="w-full bg-card rounded-2xl shadow-xl overflow-hidden p-6">
                <h2 className="text-lg font-bold text-foreground mb-4 text-center">📺 使用教程</h2>
                <div dangerouslySetInnerHTML={{ __html: videoHtml }} className="rounded-xl overflow-hidden" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main portal
  return (
    <div className="bg-muted min-h-screen text-foreground">
      <nav className="bg-card shadow-sm px-6 py-4 flex justify-between items-center border-b border-border">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-2xl font-extrabold text-client-primary hover:opacity-80 transition-opacity">首页</Link>
          <span className="text-border">|</span>
          <div className="flex items-center text-client-primary font-bold text-xl">
            <Activity className="mr-2" /> 自助服务中心
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLogged(false)}
            className="text-muted-foreground hover:text-foreground flex items-center text-sm font-medium"
          >
            <LogOut className="w-4 h-4 mr-1" /> 退出
          </button>
          <ThemeToggle />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-3">
          <button
            onClick={() => setTab("dashboard")}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold ${tab === "dashboard" ? "bg-client-primary text-client-primary-foreground shadow-md" : "bg-card text-muted-foreground hover:bg-secondary border border-border"}`}
          >
            <Clock className="w-5 h-5 mr-3" /> 我的状态
          </button>
          <button
            onClick={() => {
              setTab("renew");
              setPayStatus(null);
            }}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold ${tab === "renew" ? "bg-client-primary text-client-primary-foreground shadow-md" : "bg-card text-muted-foreground hover:bg-secondary border border-border"}`}
          >
            <CreditCard className="w-5 h-5 mr-3" /> 在线续费
          </button>
          <button
            onClick={() => {
              setTab("orders");
              if (uuid && orders.length === 0) {
                setOrdersLoading(true);
                getOrders(uuid).then(setOrders).catch(() => {}).finally(() => setOrdersLoading(false));
              }
            }}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold ${tab === "orders" ? "bg-client-primary text-client-primary-foreground shadow-md" : "bg-card text-muted-foreground hover:bg-secondary border border-border"}`}
          >
            <Activity className="w-5 h-5 mr-3" /> 订单记录
          </button>
        </div>

        <div className="md:col-span-3 bg-card rounded-2xl shadow-sm border border-border p-8">
          {tab === "dashboard" && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold border-b border-border pb-4 mb-6">当前运行状态</h2>
              <div className="bg-client-primary/10 border border-client-primary/20 text-client-primary px-4 py-3 rounded-xl mb-6 space-y-2 shadow-sm">
                <div className="flex items-center">
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  <span className="font-medium text-sm">当前登录节点 UUID: </span>
                  <span className="ml-2 font-mono text-xs bg-background px-2 py-1 rounded border border-border truncate">
                    {uuid}
                  </span>
                </div>
                {clientData.email && (
                  <div className="flex items-center pl-7">
                    <User className="w-4 h-4 mr-2 opacity-70" />
                    <span className="font-medium text-sm">备注名称: </span>
                    <span className="ml-2 text-sm font-mono bg-background px-2 py-1 rounded border border-border">
                      {clientData.email}
                    </span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-client-primary/5 p-6 rounded-2xl border border-client-primary/20">
                  <div className="text-client-primary font-bold mb-2">剩余时间</div>
                  <div className="flex items-end">
                    <span className="text-5xl font-extrabold text-foreground">{getDaysLeft()}</span>
                    <span className="text-client-primary font-bold mb-1 ml-2">天</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 font-medium">
                    到期日: {new Date(clientData.expiryDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-success/5 p-6 rounded-2xl border border-success/20">
                  <div className="text-success font-bold mb-2">本月流量使用情况</div>
                  <div className="flex items-end mb-3">
                    <span className="text-5xl font-extrabold text-foreground">{clientData.trafficUsed.toFixed(1)}</span>
                    <span className="text-success font-bold mb-1 ml-2">/ {clientData.trafficTotal} GB</span>
                  </div>
                  <div className="w-full bg-success/20 rounded-full h-2.5">
                    <div
                      className="bg-success h-2.5 rounded-full"
                      style={{ width: `${(clientData.trafficUsed / clientData.trafficTotal) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "renew" && config && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold border-b border-border pb-4 mb-6">购买与续费</h2>
              {payStatus === "success" ? (
                <div className="bg-success/10 border border-success/20 p-8 rounded-2xl text-center">
                  <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">续费成功！</h3>
                  <p className="text-muted-foreground mb-6">您的节点数据已实时同步至后台，流量已重置。</p>
                  <button
                    onClick={() => setTab("dashboard")}
                    className="bg-success text-success-foreground font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-colors shadow-lg"
                  >
                    查看最新状态
                  </button>
                </div>
              ) : (
                <div className="space-y-10">
                  {(() => {
                    const email = clientData?.email || "";
                    const isExclusive = email.includes("独享");
                    const isShared = email.includes("共享");
                    const exclusiveDisabled = isShared;
                    const sharedDisabled = isExclusive;
                    return null;
                  })()}
                  {/* 独享分组 */}
                  {dynamicPlans.filter((p) => p.category === "exclusive").length > 0 && (
                    <div className={`${(clientData?.email || "").includes("共享") ? "opacity-50 grayscale pointer-events-none" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🔒</span>
                        <h3 className="text-xl font-bold text-foreground">独享套餐</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        带宽独享，不与他人共用线路，速度更快更稳定，适合高需求用户
                        {(clientData?.email || "").includes("共享") && (
                          <span className="block text-destructive font-bold mt-1">⚠️ 您是共享用户，无法购买独享套餐</span>
                        )}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {dynamicPlans
                          .filter((p) => p.category === "exclusive")
                          .map((plan) => (
                            <div
                              key={plan.id}
                              className={`rounded-2xl p-6 relative transition-colors ${plan.featured ? "border-2 border-client-primary shadow-xl transform md:-translate-y-2 bg-card" : "border border-border hover:border-client-primary bg-card"}`}
                            >
                              {plan.featured && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-client-primary text-client-primary-foreground text-xs font-bold px-4 py-1 rounded-full shadow-sm">
                                  推荐
                                </div>
                              )}
                              <h3 className={`text-lg font-bold mb-2 ${plan.featured ? "" : "text-muted-foreground"}`}>
                                {plan.title}
                              </h3>
                              <div className="text-4xl font-extrabold text-client-primary mb-3">
                                ¥{plan.price}
                                <span className="text-base font-normal text-muted-foreground">
                                  /{plan.duration_days}天
                                </span>
                              </div>
                              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                                <li className="flex items-center">
                                  <ChevronRight className="w-4 h-4 text-client-primary mr-1 shrink-0" />{" "}
                                  {plan.description || "独享带宽，速度有保障"}
                                </li>
                                <li className="flex items-center">
                                  <ChevronRight className="w-4 h-4 text-client-primary mr-1 shrink-0" /> 增加{" "}
                                  {plan.duration_days} 天有效期
                                </li>
                                <li className="flex items-center">
                                  <ChevronRight className="w-4 h-4 text-client-primary mr-1 shrink-0" /> 立即重置流量
                                </li>
                              </ul>
                              <button
                                onClick={() => initiateCheckout(plan.duration_months, plan.price, plan.title)}
                                className={`w-full font-bold py-3 rounded-xl transition-colors ${plan.featured ? "bg-client-primary text-client-primary-foreground hover:opacity-90 shadow-md" : "bg-client-primary/10 text-client-primary hover:bg-client-primary hover:text-client-primary-foreground"}`}
                              >
                                立即购买
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 共享分组 */}
                  {dynamicPlans.filter((p) => p.category === "shared").length > 0 && (
                    <div className={`${(clientData?.email || "").includes("独享") ? "opacity-50 grayscale pointer-events-none" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">👥</span>
                        <h3 className="text-xl font-bold text-foreground">共享套餐</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        多人共用线路，价格更实惠，适合日常轻度使用
                        {(clientData?.email || "").includes("独享") && (
                          <span className="block text-destructive font-bold mt-1">⚠️ 您是独享用户，无法购买共享套餐</span>
                        )}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {dynamicPlans
                          .filter((p) => p.category === "shared")
                          .map((plan) => (
                            <div
                              key={plan.id}
                              className={`rounded-2xl p-6 relative transition-colors ${plan.featured ? "border-2 border-success shadow-xl transform md:-translate-y-2 bg-card" : "border border-border hover:border-success bg-card"}`}
                            >
                              {plan.featured && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-success text-success-foreground text-xs font-bold px-4 py-1 rounded-full shadow-sm">
                                  性价比
                                </div>
                              )}
                              <h3 className={`text-lg font-bold mb-2 ${plan.featured ? "" : "text-muted-foreground"}`}>
                                {plan.title}
                              </h3>
                              <div className="text-4xl font-extrabold text-success mb-3">
                                ¥{plan.price}
                                <span className="text-base font-normal text-muted-foreground">
                                  /{plan.duration_days}天
                                </span>
                              </div>
                              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                                <li className="flex items-center">
                                  <ChevronRight className="w-4 h-4 text-success mr-1 shrink-0" />{" "}
                                  {plan.description || "多人共享，价格实惠"}
                                </li>
                                <li className="flex items-center">
                                  <ChevronRight className="w-4 h-4 text-success mr-1 shrink-0" /> 增加{" "}
                                  {plan.duration_days} 天有效期
                                </li>
                                <li className="flex items-center">
                                  <ChevronRight className="w-4 h-4 text-success mr-1 shrink-0" /> 立即重置流量
                                </li>
                              </ul>
                              <button
                                onClick={() => initiateCheckout(plan.duration_months, plan.price, plan.title)}
                                className={`w-full font-bold py-3 rounded-xl transition-colors ${plan.featured ? "bg-success text-success-foreground hover:opacity-90 shadow-md" : "bg-success/10 text-success hover:bg-success hover:text-success-foreground"}`}
                              >
                                立即购买
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {dynamicPlans.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">暂无可用套餐</div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "checkout" && checkoutData && config && (
            <div className="animate-fade-in max-w-2xl mx-auto">
              <div className="flex items-center mb-6">
                <button
                  onClick={() => {
                    cleanupPolling();
                    setTab("renew");
                    setPayStatus(null);
                  }}
                  className="text-muted-foreground hover:text-foreground mr-4 font-medium flex items-center"
                >
                  &larr; 返回
                </button>
                <h2 className="text-2xl font-bold">收银台</h2>
                {countdown > 0 && (
                  <span className="ml-auto text-sm font-mono text-muted-foreground">
                    ⏱ {formatCountdown(countdown)}
                  </span>
                )}
              </div>

              {/* Status banners */}
              {payStatus === "success" && (
                <div className="bg-success/10 border border-success/20 p-6 rounded-2xl text-center mb-6">
                  <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                  <h3 className="text-xl font-bold mb-2">支付成功！续期已完成</h3>
                  <button
                    onClick={() => {
                      setTab("dashboard");
                      setPayStatus(null);
                    }}
                    className="bg-success text-success-foreground font-bold px-6 py-2 rounded-xl mt-2"
                  >
                    查看最新状态
                  </button>
                </div>
              )}
              {payStatus === "paid_unfulfilled" && (
                <div className="bg-warning/10 border border-warning/20 p-6 rounded-2xl text-center mb-6">
                  <h3 className="text-lg font-bold mb-2">⚠️ 支付已确认，但续期操作失败</h3>
                  <p className="text-muted-foreground text-sm">请联系站长处理，订单号：{orderId}</p>
                </div>
              )}
              {payStatus === "expired" && (
                <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-2xl text-center mb-6">
                  <h3 className="text-lg font-bold mb-2">⏰ 订单已超时</h3>
                  <p className="text-muted-foreground text-sm mb-3">请返回重新下单</p>
                  <button
                    onClick={() => {
                      setTab("renew");
                      setPayStatus(null);
                    }}
                    className="bg-client-primary text-client-primary-foreground font-bold px-6 py-2 rounded-xl"
                  >
                    重新选择套餐
                  </button>
                </div>
              )}
              {payStatus === "error" && (
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl text-center mb-6">
                  <p className="text-destructive font-bold">{error || "创建订单失败，请重试"}</p>
                </div>
              )}

              {!["success", "expired", "paid_unfulfilled"].includes(payStatus || "") && (
                <>
                  <div className="bg-muted border border-border rounded-2xl p-6 mb-6">
                    <h3 className="text-muted-foreground font-bold mb-1">订单信息</h3>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold">{checkoutData.planName}</span>
                      <span className="text-2xl font-extrabold text-client-primary">¥{checkoutData.price}</span>
                    </div>
                  </div>

                  {/* Before order created: select method */}
                  {!payStatus || payStatus === "error" ? (
                    <>
                      <h3 className="font-bold mb-4">请选择支付方式</h3>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        {config.hupi_wechat && (
                          <button
                            onClick={() => setSelectedMethod("wechat")}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${selectedMethod === "wechat" ? "border-success bg-success/10 text-success" : "border-border hover:border-success/50"}`}
                          >
                            <Smartphone className="w-8 h-8 mb-2 text-success" />
                            <span className="font-bold">微信支付</span>
                          </button>
                        )}
                        {config.hupi_alipay && (
                          <button
                            onClick={() => setSelectedMethod("alipay")}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${selectedMethod === "alipay" ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50"}`}
                          >
                            <Smartphone className="w-8 h-8 mb-2 text-accent" />
                            <span className="font-bold">支付宝</span>
                          </button>
                        )}
                        {config.crypto_usdt && (
                          <button
                            onClick={() => handleSelectCrypto("usdt")}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${selectedMethod === "usdt" ? "border-success bg-success/10 text-success" : "border-border hover:border-success/50"}`}
                          >
                            <Bitcoin className="w-8 h-8 mb-2 text-success" />
                            <span className="font-bold">USDT (TRC20)</span>
                          </button>
                        )}
                        {config.crypto_trx && (
                          <button
                            onClick={() => handleSelectCrypto("trx")}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${selectedMethod === "trx" ? "border-destructive bg-destructive/10 text-destructive" : "border-border hover:border-destructive/50"}`}
                          >
                            <Bitcoin className="w-8 h-8 mb-2 text-destructive" />
                            <span className="font-bold">TRX (波场)</span>
                          </button>
                        )}
                      </div>

                      {selectedMethod && !["usdt", "trx"].includes(selectedMethod) && (
                        <button
                          onClick={confirmPayment}
                          disabled={orderCreating}
                          className="w-full bg-client-primary text-client-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-colors shadow-md"
                        >
                          {orderCreating ? "正在创建订单..." : "确认支付方式"}
                        </button>
                      )}

                      {ratesLoading && (
                        <div className="text-center text-muted-foreground py-4 animate-pulse">正在获取实时汇率...</div>
                      )}

                      {["usdt", "trx"].includes(selectedMethod) && !ratesLoading && (
                        <div className="bg-card border-2 border-border rounded-2xl p-8 text-center animate-fade-in shadow-sm">
                          <div className="bg-warning/10 text-warning p-3 rounded-lg mb-4 text-sm font-bold border border-warning/20">
                            ⚠️ 防撞单机制：请严格按照下方显示的精确金额付款，否则系统无法自动到账！
                          </div>
                          {exchangeRates && (
                            <p className="text-xs text-muted-foreground mb-2">
                              实时汇率 (币安)：1 {selectedMethod.toUpperCase()} ≈ ¥{(selectedMethod === "usdt" ? exchangeRates.usdtCny : exchangeRates.trxCny).toFixed(4)}
                            </p>
                          )}
                          <p className="text-muted-foreground mb-2">应付总额 ({selectedMethod.toUpperCase()})</p>
                          <div className="text-4xl font-extrabold text-client-primary mb-6">{cryptoPrice}</div>
                          <div className="bg-muted p-4 rounded-lg break-all font-mono text-sm text-muted-foreground mb-6 border border-border">
                            {config.crypto_address || "（站长未设置收款地址）"}
                          </div>
                          <button
                            onClick={confirmPayment}
                            disabled={orderCreating}
                            className="w-full bg-client-primary text-client-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-colors shadow-md"
                          >
                            {orderCreating ? "正在创建订单..." : "确认下单并去转账"}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    /* After order created: show payment details */
                    <div className="bg-card border-2 border-border rounded-2xl p-8 text-center animate-fade-in shadow-sm">
                      {payStatus === "creating" && (
                        <div className="py-8">
                          <div className="animate-spin w-10 h-10 border-4 border-client-primary border-t-transparent rounded-full mx-auto mb-4" />
                          <p className="text-muted-foreground font-bold">正在创建订单...</p>
                        </div>
                      )}

                      {payStatus === "waiting" && ["usdt", "trx"].includes(selectedMethod) && (
                        <div>
                          <div className="bg-success/10 text-success p-3 rounded-lg mb-4 text-sm font-bold border border-success/20">
                            ✅ 订单已创建，请转账后点击验证
                          </div>
                          {exchangeRates && (
                            <p className="text-xs text-muted-foreground mb-2">
                              实时汇率 (币安)：1 {selectedMethod.toUpperCase()} ≈ ¥{(selectedMethod === "usdt" ? exchangeRates.usdtCny : exchangeRates.trxCny).toFixed(4)}
                            </p>
                          )}
                          <p className="text-muted-foreground mb-2">应付总额 ({selectedMethod.toUpperCase()})</p>
                          <div className="text-4xl font-extrabold text-client-primary mb-4">{cryptoPrice}</div>
                          <div className="bg-muted p-4 rounded-lg break-all font-mono text-sm text-muted-foreground mb-6 border border-border">
                            {config.crypto_address}
                          </div>
                          {error && <p className="text-warning text-sm mb-3">{error}</p>}
                          <button
                            onClick={handleCryptoVerify}
                            className="w-full bg-client-primary text-client-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-colors shadow-md"
                          >
                            我已转账，点击验证
                          </button>
                          <p className="text-xs text-muted-foreground mt-3">
                            系统每5秒自动检测链上转账，也可手动点击验证
                          </p>
                        </div>
                      )}

                      {payStatus === "waiting" && !["usdt", "trx"].includes(selectedMethod) && (
                        <div>
                          <div className="bg-success/10 text-success p-3 rounded-lg mb-4 text-sm font-bold border border-success/20">
                            ✅ 订单已创建，请扫码支付
                          </div>
                          {qrCodeUrl ? (
                            <img
                              src={qrCodeUrl}
                              alt="支付二维码"
                              className="w-48 h-48 mx-auto mb-4 rounded-xl border border-border"
                            />
                          ) : payUrl ? (
                            <div className="mb-4">
                              <a
                                href={payUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block bg-client-primary text-client-primary-foreground font-bold px-6 py-3 rounded-xl hover:opacity-90"
                              >
                                点击打开支付页面
                              </a>
                            </div>
                          ) : (
                            <div className="w-48 h-48 bg-muted border border-border mx-auto rounded-xl flex items-center justify-center mb-4">
                              <QrCode className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          <p className="text-muted-foreground font-bold mb-2">
                            请使用 {selectedMethod === "wechat" ? "微信" : "支付宝"} 扫码付款 ¥{checkoutData.price}
                          </p>
                          <p className="text-xs text-muted-foreground">支付完成后系统将自动确认，请勿关闭此页面</p>
                        </div>
                      )}

                      {payStatus === "verifying" && (
                        <div className="py-4">
                          <div className="animate-spin w-8 h-8 border-4 border-client-primary border-t-transparent rounded-full mx-auto mb-3" />
                          <p className="text-muted-foreground font-bold">正在验证链上转账...</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "orders" && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold border-b border-border pb-4 mb-6">订单记录</h2>
              {ordersLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-client-primary border-t-transparent rounded-full" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">暂无订单记录</div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-border rounded-xl p-4 bg-muted/30">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-foreground">{order.plan_name}</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          order.status === "paid" || order.status === "fulfilled"
                            ? "bg-success/20 text-success"
                            : order.status === "expired"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-warning/20 text-warning"
                        }`}>
                          {order.status === "fulfilled" ? "已完成" : order.status === "paid" ? "已支付" : order.status === "expired" ? "已过期" : "待支付"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span className="block text-xs">金额</span>
                          <span className="font-mono font-bold text-foreground">
                            {order.crypto_amount ? `${order.crypto_amount} ${order.crypto_currency || ""}` : `¥${order.amount}`}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs">支付方式</span>
                          <span className="font-bold text-foreground">
                            {order.payment_method === "wechat" ? "微信" : order.payment_method === "alipay" ? "支付宝" : order.payment_method?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs">时长</span>
                          <span className="font-bold text-foreground">{order.months}个月</span>
                        </div>
                        <div>
                          <span className="block text-xs">下单时间</span>
                          <span className="font-bold text-foreground">{new Date(order.created_at).toLocaleDateString("zh-CN")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
