import { useState, useEffect, useRef } from "react";
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
import { getPublicConfig, lookupClient } from "@/lib/api";

interface PublicConfig {
  price_month: number;
  price_quarter: number;
  price_year: number;
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
  const [checkoutData, setCheckoutData] = useState<{ months: number; price: number; planName: string } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [cryptoPrice, setCryptoPrice] = useState(0);
  const [qrStatus, setQrStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPublicConfig()
      .then(setConfig)
      .catch(() => {});
    // Load jsQR
    if (!(window as any).jsQR) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  const extractUuid = (input: string) => {
    const trimmed = input.trim();
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidRegex.test(trimmed)) return trimmed;
    try {
      if (trimmed.startsWith("vless://") || trimmed.startsWith("trojan://")) {
        const extracted = trimmed.split("://")[1].split("@")[0];
        if (uuidRegex.test(extracted)) return extracted;
      } else if (trimmed.startsWith("vmess://")) {
        const decoded = atob(trimmed.substring(8));
        const json = JSON.parse(decoded);
        if (json?.id && uuidRegex.test(json.id)) return json.id;
      }
    } catch {}
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
    const extracted = extractUuid(loginInput);
    if (!extracted) {
      setError("格式错误！请输入正确的 UUID 或完整的节点链接。");
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

  const initiateCheckout = (months: number, price: number, planName: string) => {
    setCheckoutData({ months, price, planName });
    setSelectedMethod("");
    setTab("checkout");
  };

  const handleSelectCrypto = (method: string) => {
    setSelectedMethod(method);
    if (checkoutData) {
      const rand = (Math.floor(Math.random() * 10) + 10) / 10000;
      setCryptoPrice(Number((checkoutData.price + rand).toFixed(4)));
    }
  };

  const confirmPayment = () => {
    setPayStatus("processing");
    setTimeout(() => {
      setPayStatus("success");
      if (checkoutData) {
        const newExpiry = new Date(clientData.expiryDate);
        newExpiry.setDate(newExpiry.getDate() + checkoutData.months * 30);
        setClientData({ ...clientData, trafficUsed: 0, expiryDate: newExpiry.getTime() });
      }
      setTab("renew");
    }, 1500);
  };

  // Login screen
  if (!logged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-xl overflow-hidden">
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
                    "例如: 550e8400-e29b-41d4...\n或者粘贴完整的 vmess:// / vless:// 链接\n🌟 支持直接在此处 Ctrl+V 粘贴二维码截图"
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
      </div>
    );
  }

  // Main portal
  return (
    <div className="bg-muted min-h-screen text-foreground">
      <nav className="bg-card shadow-sm px-6 py-4 flex justify-between items-center border-b border-border">
        <div className="flex items-center text-client-primary font-bold text-xl">
          <Activity className="mr-2" /> 自助服务中心
        </div>
        <button
          onClick={() => setLogged(false)}
          className="text-muted-foreground hover:text-foreground flex items-center text-sm font-medium"
        >
          <LogOut className="w-4 h-4 mr-1" /> 退出
        </button>
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
        </div>

        <div className="md:col-span-3 bg-card rounded-2xl shadow-sm border border-border p-8">
          {tab === "dashboard" && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold border-b border-border pb-4 mb-6">当前运行状态</h2>
              <div className="bg-client-primary/10 border border-client-primary/20 text-client-primary px-4 py-3 rounded-xl mb-6 flex items-center shadow-sm">
                <ShieldCheck className="w-5 h-5 mr-2" />
                <span className="font-medium text-sm">当前登录节点 UUID: </span>
                <span className="ml-2 font-mono text-xs bg-background px-2 py-1 rounded border border-border truncate">
                  {uuid}
                </span>
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
              <h2 className="text-2xl font-bold border-b border-border pb-4 mb-6">
                购买与续费，独享的用户续费共享，导致链接被锁后果自负
              </h2>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  {[
                    {
                      label: "月付套餐",
                      price: config.price_month,
                      months: 1,
                      days: 30,
                      suffix: "/月",
                      featured: false,
                    },
                    {
                      label: "季付套餐",
                      price: config.price_quarter,
                      months: 3,
                      days: 90,
                      suffix: "/3个月",
                      featured: true,
                    },
                    {
                      label: "年付套餐",
                      price: config.price_year,
                      months: 12,
                      days: 365,
                      suffix: "/年",
                      featured: false,
                    },
                  ].map((plan) => (
                    <div
                      key={plan.label}
                      className={`rounded-2xl p-6 relative transition-colors ${plan.featured ? "border-2 border-client-primary shadow-xl transform md:-translate-y-2 bg-card" : "border border-border hover:border-client-primary"}`}
                    >
                      {plan.featured && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-client-primary text-client-primary-foreground text-xs font-bold px-4 py-1 rounded-full shadow-sm">
                          推荐选择
                        </div>
                      )}
                      <h3 className={`text-lg font-bold mb-2 ${plan.featured ? "" : "text-muted-foreground"}`}>
                        {plan.label}
                      </h3>
                      <div className="text-4xl font-extrabold text-client-primary mb-4">
                        ¥{plan.price}
                        <span className="text-base font-normal text-muted-foreground">{plan.suffix}</span>
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-3 mb-8">
                        <li className="flex items-center">
                          <ChevronRight className="w-4 h-4 text-client-primary mr-1" /> 增加 {plan.days} 天有效期
                        </li>
                        <li className="flex items-center">
                          <ChevronRight className="w-4 h-4 text-client-primary mr-1" /> 立即重置流量
                        </li>
                      </ul>
                      <button
                        onClick={() => initiateCheckout(plan.months, plan.price, plan.label)}
                        className={`w-full font-bold py-3 rounded-xl transition-colors ${plan.featured ? "bg-client-primary text-client-primary-foreground hover:opacity-90 shadow-md" : "bg-client-primary/10 text-client-primary hover:bg-client-primary hover:text-client-primary-foreground"}`}
                      >
                        立即购买
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "checkout" && checkoutData && config && (
            <div className="animate-fade-in max-w-2xl mx-auto">
              <div className="flex items-center mb-6">
                <button
                  onClick={() => setTab("renew")}
                  className="text-muted-foreground hover:text-foreground mr-4 font-medium flex items-center"
                >
                  &larr; 返回
                </button>
                <h2 className="text-2xl font-bold">收银台</h2>
              </div>

              <div className="bg-muted border border-border rounded-2xl p-6 mb-6">
                <h3 className="text-muted-foreground font-bold mb-1">订单信息</h3>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">{checkoutData.planName}</span>
                  <span className="text-2xl font-extrabold text-client-primary">¥{checkoutData.price}</span>
                </div>
              </div>

              <h3 className="font-bold mb-4">请选择支付方式</h3>
              <div className="grid grid-cols-2 gap-4 mb-8">
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

              {selectedMethod && (
                <div className="bg-card border-2 border-border rounded-2xl p-8 text-center animate-fade-in shadow-sm">
                  {["usdt", "trx"].includes(selectedMethod) ? (
                    <div>
                      <div className="bg-warning/10 text-warning p-3 rounded-lg mb-4 text-sm font-bold border border-warning/20">
                        ⚠️ 防撞单机制：请严格按照下方显示的精确金额付款，否则系统无法自动到账！
                      </div>
                      <p className="text-muted-foreground mb-2">应付总额 ({selectedMethod.toUpperCase()})</p>
                      <div className="text-4xl font-extrabold text-client-primary mb-6">{cryptoPrice}</div>
                      <div className="bg-muted p-4 rounded-lg break-all font-mono text-sm text-muted-foreground mb-6 border border-border">
                        {config.crypto_address || "（站长未设置收款地址）"}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="w-48 h-48 bg-muted border border-border mx-auto rounded-xl flex items-center justify-center mb-6 relative">
                        <QrCode className="w-12 h-12 text-muted-foreground" />
                        <span className="absolute text-muted-foreground font-bold">扫码支付</span>
                      </div>
                      <p className="text-muted-foreground mb-6 font-bold">
                        请使用 {selectedMethod === "wechat" ? "微信" : "支付宝"} 扫码付款 ¥{checkoutData.price}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={confirmPayment}
                    disabled={payStatus === "processing"}
                    className="w-full bg-client-primary text-client-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-colors shadow-md flex justify-center items-center"
                  >
                    {payStatus === "processing" ? "正在验证订单..." : "我已完成付款"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
