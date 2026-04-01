import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Server, QrCode, Bitcoin, CheckCircle2, Plus, Trash2, Package, ClipboardList, Search, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAdminConfig, saveAdminConfig, testPanelConnection, adminGetPlans, adminCreatePlan, adminUpdatePlan, adminDeletePlan, adminGetOrders, adminDeleteOrder, adminBatchDeleteOrders } from "@/lib/api";

interface AdminConfigData {
  panelUrl: string;
  panelUser: string;
  panelPass: string;
  priceMonth: number;
  priceQuarter: number;
  priceYear: number;
  priceExclusiveMonth: number;
  priceExclusiveQuarter: number;
  priceExclusiveYear: number;
  priceSharedMonth: number;
  priceSharedQuarter: number;
  priceSharedYear: number;
  hupiWechatAppId: string;
  hupiWechatAppSecret: string;
  hupiAlipayAppId: string;
  hupiAlipayAppSecret: string;
  hupiWechat: boolean;
  hupiAlipay: boolean;
  cryptoAddress: string;
  cryptoKey: string;
  cryptoUsdt: boolean;
  cryptoTrx: boolean;
  tawkId: string;
  qqQrcodeUrl: string;
  telegramLink: string;
  videoEmbed: string;
  resendApiKey: string;
  notifyEmail: string;
  salesInboundId: number;
  salesProtocol: string;
}

interface Plan {
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

interface Order {
  id: string;
  uuid: string;
  plan_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  fulfilled_at: string | null;
  email: string | null;
  crypto_amount: number | null;
  crypto_currency: string | null;
  tx_hash: string | null;
  months: number;
  remark?: string;
}

const defaultConfig: AdminConfigData = {
  panelUrl: "http://127.0.0.1:2053",
  panelUser: "admin",
  panelPass: "",
  priceMonth: 15,
  priceQuarter: 40,
  priceYear: 150,
  priceExclusiveMonth: 25,
  priceExclusiveQuarter: 65,
  priceExclusiveYear: 240,
  priceSharedMonth: 15,
  priceSharedQuarter: 40,
  priceSharedYear: 150,
  hupiWechatAppId: "",
  hupiWechatAppSecret: "",
  hupiAlipayAppId: "",
  hupiAlipayAppSecret: "",
  hupiWechat: true,
  hupiAlipay: true,
  cryptoAddress: "",
  cryptoKey: "",
  cryptoUsdt: true,
  cryptoTrx: true,
  tawkId: "",
  qqQrcodeUrl: "",
  telegramLink: "",
  videoEmbed: "",
  resendApiKey: "",
  notifyEmail: "",
  salesInboundId: 1,
  salesProtocol: "mixed",
};

export default function AdminDashboard() {
  const [config, setConfig] = useState<AdminConfigData>(defaultConfig);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [btnStatus, setBtnStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersSearch, setOrdersSearch] = useState("");
  const [ordersStatus, setOrdersStatus] = useState("all");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const token = sessionStorage.getItem("admin_token") || "";

  useEffect(() => {
    if (!token) {
      navigate("/admin");
      return;
    }
    loadConfig();
    loadPlans();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await getAdminConfig(token);
      if (res?.config) setConfig(res.config);
    } catch {
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const res = await adminGetPlans(token);
      if (res?.plans) setPlans(res.plans);
    } catch {}
  };

  const loadOrders = async (page = 1, search = ordersSearch, status = ordersStatus) => {
    setOrdersLoading(true);
    try {
      const res = await adminGetOrders(token, { page, pageSize: 20, search: search || undefined, statusFilter: status });
      if (res?.orders) setOrders(res.orders);
      if (res?.total != null) setOrdersTotal(res.total);
    } catch {}
    setOrdersLoading(false);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("确定删除该订单？")) return;
    try {
      await adminDeleteOrder(token, orderId);
      setOrders(orders.filter(o => o.id !== orderId));
      setOrdersTotal(prev => prev - 1);
      setSelectedOrders(prev => { const s = new Set(prev); s.delete(orderId); return s; });
    } catch {}
  };

  const handleBatchDelete = async () => {
    if (selectedOrders.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedOrders.size} 条订单？`)) return;
    setBtnStatus(prev => ({ ...prev, batchDel: "删除中..." }));
    try {
      await adminBatchDeleteOrders(token, Array.from(selectedOrders));
      setOrders(orders.filter(o => !selectedOrders.has(o.id)));
      setOrdersTotal(prev => prev - selectedOrders.size);
      setSelectedOrders(new Set());
      setBtnStatus(prev => ({ ...prev, batchDel: "✅ 已删除" }));
    } catch {
      setBtnStatus(prev => ({ ...prev, batchDel: "❌ 失败" }));
    }
    setTimeout(() => setBtnStatus(prev => ({ ...prev, batchDel: "" })), 2000);
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrders(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  };

  const setBtnLoading = (key: string, text: string) => {
    setBtnStatus(prev => ({ ...prev, [key]: text }));
  };
  const clearBtn = (key: string, delay = 2000) => {
    setTimeout(() => setBtnStatus(prev => ({ ...prev, [key]: "" })), delay);
  };

  const handleSave = async (btnKey: string) => {
    setBtnLoading(btnKey, "保存中...");
    try {
      await saveAdminConfig(token, config);
      setBtnLoading(btnKey, "✅ 已保存");
    } catch {
      setBtnLoading(btnKey, "❌ 失败");
    }
    clearBtn(btnKey);
  };

  const handleTest = async () => {
    setBtnLoading("test", "连接中...");
    try {
      const res = await testPanelConnection(token, config.panelUrl, config.panelUser, config.panelPass);
      setBtnLoading("test", res?.success ? "✅ 连接成功" : "❌ 连接失败");
    } catch {
      setBtnLoading("test", "❌ 失败");
    }
    clearBtn("test", 3000);
  };

  const handleAddPlan = async () => {
    setBtnLoading("addPlan", "添加中...");
    try {
      const maxSort = plans.length > 0 ? Math.max(...plans.map(p => p.sort_order)) : 0;
      await adminCreatePlan(token, {
        title: "新套餐",
        category: "exclusive",
        duration_months: 1,
        duration_days: 30,
        price: 10,
        description: "套餐描述",
        sort_order: maxSort + 1,
        featured: false,
        enabled: true,
      });
      await loadPlans();
      setBtnLoading("addPlan", "✅ 已添加");
    } catch {
      setBtnLoading("addPlan", "❌ 失败");
    }
    clearBtn("addPlan");
  };

  const handleUpdatePlan = async (plan: Plan) => {
    const key = `save-${plan.id}`;
    setBtnLoading(key, "保存中...");
    try {
      await adminUpdatePlan(token, plan);
      setBtnLoading(key, "✅ 已保存");
    } catch {
      setBtnLoading(key, "❌ 失败");
    }
    clearBtn(key);
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("确定删除该套餐？")) return;
    const key = `del-${id}`;
    setBtnLoading(key, "删除中...");
    try {
      await adminDeletePlan(token, id);
      setPlans(plans.filter(p => p.id !== id));
    } catch {
      setBtnLoading(key, "❌ 失败");
      clearBtn(key);
    }
  };

  const updatePlanField = (id: string, field: keyof Plan, value: any) => {
    setPlans(plans.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const logout = () => {
    sessionStorage.removeItem("admin_token");
    navigate("/admin");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-muted text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="bg-muted min-h-screen p-6 text-foreground">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center bg-card p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center space-x-3">
            <Settings className="w-8 h-8 text-admin-primary" />
            <h1 className="text-2xl font-bold">系统控制台</h1>
          </div>
          <button onClick={logout} className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg font-medium transition-colors">
            退出登录
          </button>
        </div>

        {/* Tab Menu */}
        <Tabs defaultValue="panel" className="w-full">
          <TabsList className="w-full grid grid-cols-5 h-12 bg-card border border-border rounded-2xl p-1">
            <TabsTrigger value="panel" className="rounded-xl data-[state=active]:bg-admin-primary data-[state=active]:text-admin-primary-foreground font-bold text-xs sm:text-sm">
              <Server className="w-4 h-4 mr-1 sm:mr-2" /> 面板对接
            </TabsTrigger>
            <TabsTrigger value="payment" className="rounded-xl data-[state=active]:bg-warning data-[state=active]:text-warning-foreground font-bold text-xs sm:text-sm">
              <QrCode className="w-4 h-4 mr-1 sm:mr-2" /> 支付网关
            </TabsTrigger>
            <TabsTrigger value="sales" className="rounded-xl data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-bold text-xs sm:text-sm">
              <ShoppingCart className="w-4 h-4 mr-1 sm:mr-2" /> 新开通售卖
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-xl data-[state=active]:bg-client-primary data-[state=active]:text-client-primary-foreground font-bold text-xs sm:text-sm">
              <Package className="w-4 h-4 mr-1 sm:mr-2" /> 商品管理
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-accent-foreground font-bold text-xs sm:text-sm" onClick={() => { if (orders.length === 0) loadOrders(); }}>
              <ClipboardList className="w-4 h-4 mr-1 sm:mr-2" /> 订单管理
            </TabsTrigger>
          </TabsList>

          {/* 面板对接配置 */}
          <TabsContent value="panel">
            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
              <h2 className="text-xl font-bold mb-6 flex items-center text-admin-primary border-b border-border pb-3">
                <Server className="w-5 h-5 mr-2" /> 3x-ui 面板对接配置
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">面板 URL 地址 (需带端口)</label>
                  <input type="text" value={config.panelUrl} onChange={e => setConfig({ ...config, panelUrl: e.target.value })}
                    className="w-full border border-input p-2.5 rounded-lg focus:ring-2 focus:ring-admin-primary outline-none bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">后台账号</label>
                  <input type="text" value={config.panelUser} onChange={e => setConfig({ ...config, panelUser: e.target.value })}
                    className="w-full border border-input p-2.5 rounded-lg focus:ring-2 focus:ring-admin-primary outline-none bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">后台密码</label>
                  <input type="password" value={config.panelPass} onChange={e => setConfig({ ...config, panelPass: e.target.value })}
                    className="w-full border border-input p-2.5 rounded-lg focus:ring-2 focus:ring-admin-primary outline-none bg-background" />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button onClick={handleTest} disabled={!!btnStatus["test"]}
                    className="flex-1 bg-secondary text-secondary-foreground py-2.5 rounded-lg font-bold hover:opacity-90 transition-colors border border-border disabled:opacity-70">
                    {btnStatus["test"] || "测试连接"}
                  </button>
                  <button onClick={() => handleSave("panel")} disabled={!!btnStatus["panel"]}
                    className="flex-1 bg-admin-primary text-admin-primary-foreground py-2.5 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md disabled:opacity-70">
                    {btnStatus["panel"] || "保存配置"}
                  </button>
                </div>
              </div>
            </div>

            {/* 悬浮按钮配置 */}
            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border mt-6">
              <h2 className="text-xl font-bold mb-6 flex items-center text-admin-primary border-b border-border pb-3">
                <Settings className="w-5 h-5 mr-2" /> 悬浮联系按钮配置
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">在线咨询 Tawk.to Widget ID</label>
                  <input type="text" value={config.tawkId} onChange={e => setConfig({ ...config, tawkId: e.target.value })}
                    placeholder="例如: 69c7635168a74a1c3a60f80a/1jkpdntv2"
                    className="w-full border border-input p-2.5 rounded-lg focus:ring-2 focus:ring-admin-primary outline-none bg-background" />
                  <p className="text-xs text-muted-foreground mt-1">格式: 站点ID/Widget ID，从 Tawk.to 后台获取</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">QQ 客服二维码图片链接</label>
                  <input type="text" value={config.qqQrcodeUrl} onChange={e => setConfig({ ...config, qqQrcodeUrl: e.target.value })}
                    placeholder="https://example.com/qq-qrcode.png"
                    className="w-full border border-input p-2.5 rounded-lg focus:ring-2 focus:ring-admin-primary outline-none bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Telegram 链接</label>
                  <input type="text" value={config.telegramLink} onChange={e => setConfig({ ...config, telegramLink: e.target.value })}
                    placeholder="https://t.me/your_username"
                    className="w-full border border-input p-2.5 rounded-lg focus:ring-2 focus:ring-admin-primary outline-none bg-background" />
                </div>
                <div className="pt-4">
                  <button onClick={() => handleSave("fab")} disabled={!!btnStatus["fab"]}
                    className="w-full bg-admin-primary text-admin-primary-foreground py-2.5 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md disabled:opacity-70">
                    {btnStatus["fab"] || "保存悬浮按钮配置"}
                  </button>
                </div>
              </div>
            </div>

            {/* 视频嵌入配置 */}
            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border mt-6">
              <h2 className="text-xl font-bold mb-6 flex items-center text-admin-primary border-b border-border pb-3">
                <Settings className="w-5 h-5 mr-2" /> 视频窗口配置
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">视频链接或嵌入代码</label>
                  <textarea
                    value={config.videoEmbed}
                    onChange={e => setConfig({ ...config, videoEmbed: e.target.value })}
                    placeholder={"支持以下格式：\n1. 直接视频链接: https://example.com/video.mp4\n2. YouTube: https://www.youtube.com/watch?v=xxx\n3. Bilibili: https://www.bilibili.com/video/BVxxx\n4. iframe 嵌入代码: <iframe src=...></iframe>"}
                    className="w-full border border-input p-2.5 rounded-lg focus:ring-2 focus:ring-admin-primary outline-none bg-background min-h-[120px] resize-y"
                  />
                  <p className="text-xs text-muted-foreground mt-1">支持 YouTube、Bilibili、抖音、MP4 直链、iframe 嵌入代码等</p>
                </div>
                <div className="pt-4">
                  <button onClick={() => handleSave("video")} disabled={!!btnStatus["video"]}
                    className="w-full bg-admin-primary text-admin-primary-foreground py-2.5 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md disabled:opacity-70">
                    {btnStatus["video"] || "保存视频配置"}
                  </button>
                </div>
              </div>
            </div>

            {/* 邮件通知配置 */}
            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border mt-6">
              <h2 className="text-xl font-bold mb-6 flex items-center text-admin-primary border-b border-border pb-3">
                <Settings className="w-5 h-5 mr-2" /> 支付成功邮件通知 (Resend)
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Resend API Key</label>
                  <input type="password" value={config.resendApiKey} onChange={e => setConfig({ ...config, resendApiKey: e.target.value })}
                    placeholder="re_xxxxxxxxx"
                    className="w-full border border-input p-2.5 rounded-lg focus:ring-2 focus:ring-admin-primary outline-none bg-background" />
                  <p className="text-xs text-muted-foreground mt-1">从 resend.com → API Keys 获取</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">通知接收邮箱</label>
                  <input type="email" value={config.notifyEmail} onChange={e => setConfig({ ...config, notifyEmail: e.target.value })}
                    placeholder="admin@example.com"
                    className="w-full border border-input p-2.5 rounded-lg focus:ring-2 focus:ring-admin-primary outline-none bg-background" />
                  <p className="text-xs text-muted-foreground mt-1">支付成功后邮件将发送到此邮箱</p>
                </div>
                <div className="pt-4">
                  <button onClick={() => handleSave("resend")} disabled={!!btnStatus["resend"]}
                    className="w-full bg-admin-primary text-admin-primary-foreground py-2.5 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md disabled:opacity-70">
                    {btnStatus["resend"] || "保存邮件通知配置"}
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 支付网关 */}
          <TabsContent value="payment">
            <div className="space-y-6">
              {/* 虎皮椒支付 */}
              <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                <h2 className="text-xl font-bold mb-6 flex items-center text-warning border-b border-border pb-3">
                  <QrCode className="w-5 h-5 mr-2" /> 虎皮椒支付设置
                </h2>
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-xl border border-border">
                    <label className="flex items-center space-x-2 cursor-pointer mb-3">
                      <input type="checkbox" checked={config.hupiWechat} onChange={e => setConfig({ ...config, hupiWechat: e.target.checked })} className="w-5 h-5 rounded" />
                      <span className="font-bold">开启微信支付</span>
                    </label>
                    {config.hupiWechat && (
                      <div className="space-y-3 pl-7 border-l-2 border-success/30 ml-2 animate-fade-in">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">微信端 AppID</label>
                          <input type="text" value={config.hupiWechatAppId} onChange={e => setConfig({ ...config, hupiWechatAppId: e.target.value })}
                            placeholder="输入虎皮椒微信 AppID" className="w-full border border-input p-2 rounded-lg focus:ring-2 focus:ring-success outline-none text-sm bg-background" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">微信端 AppSecret</label>
                          <input type="password" value={config.hupiWechatAppSecret} onChange={e => setConfig({ ...config, hupiWechatAppSecret: e.target.value })}
                            placeholder="输入虎皮椒微信 AppSecret" className="w-full border border-input p-2 rounded-lg focus:ring-2 focus:ring-success outline-none text-sm bg-background" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-muted p-4 rounded-xl border border-border">
                    <label className="flex items-center space-x-2 cursor-pointer mb-3">
                      <input type="checkbox" checked={config.hupiAlipay} onChange={e => setConfig({ ...config, hupiAlipay: e.target.checked })} className="w-5 h-5 rounded" />
                      <span className="font-bold">开启支付宝</span>
                    </label>
                    {config.hupiAlipay && (
                      <div className="space-y-3 pl-7 border-l-2 border-accent/30 ml-2 animate-fade-in">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">支付宝端 AppID</label>
                          <input type="text" value={config.hupiAlipayAppId} onChange={e => setConfig({ ...config, hupiAlipayAppId: e.target.value })}
                            placeholder="输入虎皮椒支付宝 AppID" className="w-full border border-input p-2 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm bg-background" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">支付宝端 AppSecret</label>
                          <input type="password" value={config.hupiAlipayAppSecret} onChange={e => setConfig({ ...config, hupiAlipayAppSecret: e.target.value })}
                            placeholder="输入虎皮椒支付宝 AppSecret" className="w-full border border-input p-2 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm bg-background" />
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleSave("payment")} disabled={!!btnStatus["payment"]}
                    className="w-full bg-warning text-warning-foreground py-3 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md flex justify-center items-center disabled:opacity-70">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> {btnStatus["payment"] || "保存支付配置"}
                  </button>
                </div>
              </div>

              {/* 虚拟货币 */}
              <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                <h2 className="text-xl font-bold mb-6 flex items-center text-accent border-b border-border pb-3">
                  <Bitcoin className="w-5 h-5 mr-2" /> 虚拟货币设置 (TronGrid)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">收款钱包地址 (TRC20)</label>
                    <input type="text" value={config.cryptoAddress} onChange={e => setConfig({ ...config, cryptoAddress: e.target.value })}
                      placeholder="例如: Txxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="w-full border border-input p-2.5 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-background" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">TronGrid API Key</label>
                    <input type="password" value={config.cryptoKey} onChange={e => setConfig({ ...config, cryptoKey: e.target.value })}
                      placeholder="输入 TronGrid API Key" className="w-full border border-input p-2.5 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-background" />
                  </div>
                  <div className="flex space-x-6 pt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={config.cryptoUsdt} onChange={e => setConfig({ ...config, cryptoUsdt: e.target.checked })} className="w-5 h-5 rounded" />
                      <span className="font-bold">支持 USDT</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={config.cryptoTrx} onChange={e => setConfig({ ...config, cryptoTrx: e.target.checked })} className="w-5 h-5 rounded" />
                      <span className="font-bold">支持 TRX</span>
                    </label>
                  </div>
                  <div className="bg-accent/10 text-accent text-xs p-3 rounded-lg border border-accent/20">
                    <span className="font-bold">💡 防撞单机制已启用：</span>
                    客户使用虚拟货币付款时，系统会自动在原价基础上加上 <b>0.001 - 0.0019</b> 的随机尾数以唯一标识订单。
                  </div>
                </div>
                <button onClick={() => handleSave("crypto")} disabled={!!btnStatus["crypto"]}
                  className="w-full bg-accent text-accent-foreground py-3 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md flex justify-center items-center mt-4 disabled:opacity-70">
                  <CheckCircle2 className="w-5 h-5 mr-2" /> {btnStatus["crypto"] || "保存加密货币配置"}
                </button>
              </div>
            </div>
          </TabsContent>

          {/* 商品管理 */}
          <TabsContent value="products">
            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
              <div className="flex items-center justify-between mb-6 border-b border-border pb-3">
                <h2 className="text-xl font-bold flex items-center text-client-primary">
                  <Package className="w-5 h-5 mr-2" /> 商品管理
                </h2>
                <button onClick={handleAddPlan} disabled={!!btnStatus["addPlan"]}
                  className="bg-client-primary text-client-primary-foreground px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-colors flex items-center text-sm shadow-md disabled:opacity-70">
                  <Plus className="w-4 h-4 mr-1" /> {btnStatus["addPlan"] || "添加套餐"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">💡 修改后请点击每行右侧的"保存"按钮。添加/删除套餐不影响现有支付接口。</p>
              <div className="space-y-3">
                {plans.map(plan => (
                  <div key={plan.id} className="bg-muted border border-border rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-3">
                        <label className="block text-xs text-muted-foreground mb-1">标题</label>
                        <input type="text" value={plan.title}
                          onChange={e => updatePlanField(plan.id, "title", e.target.value)}
                          className="w-full border border-input p-2 rounded-lg text-sm bg-background focus:ring-2 focus:ring-client-primary outline-none" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-muted-foreground mb-1">分类</label>
                        <select value={plan.category}
                          onChange={e => updatePlanField(plan.id, "category", e.target.value)}
                          className="w-full border border-input p-2 rounded-lg text-sm bg-background focus:ring-2 focus:ring-client-primary outline-none">
                          <option value="exclusive">🔒 独享</option>
                          <option value="shared">👥 共享</option>
                        </select>
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs text-muted-foreground mb-1">天数</label>
                        <input type="number" value={plan.duration_days}
                          onChange={e => {
                            const days = Number(e.target.value);
                            updatePlanField(plan.id, "duration_days", days);
                            updatePlanField(plan.id, "duration_months", Math.round(days / 30) || 1);
                          }}
                          className="w-full border border-input p-2 rounded-lg text-sm bg-background focus:ring-2 focus:ring-client-primary outline-none" />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs text-muted-foreground mb-1">价格¥</label>
                        <input type="number" value={plan.price}
                          onChange={e => updatePlanField(plan.id, "price", Number(e.target.value))}
                          className="w-full border border-input p-2 rounded-lg text-sm bg-background focus:ring-2 focus:ring-client-primary outline-none" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-muted-foreground mb-1">描述</label>
                        <input type="text" value={plan.description}
                          onChange={e => updatePlanField(plan.id, "description", e.target.value)}
                          className="w-full border border-input p-2 rounded-lg text-sm bg-background focus:ring-2 focus:ring-client-primary outline-none" />
                      </div>
                      <div className="md:col-span-1 flex items-end gap-2">
                        <label className="flex items-center gap-1 cursor-pointer text-xs">
                          <input type="checkbox" checked={plan.featured}
                            onChange={e => updatePlanField(plan.id, "featured", e.target.checked)}
                            className="w-4 h-4 rounded" />
                          推荐
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-xs">
                          <input type="checkbox" checked={plan.enabled}
                            onChange={e => updatePlanField(plan.id, "enabled", e.target.checked)}
                            className="w-4 h-4 rounded" />
                          启用
                        </label>
                      </div>
                      <div className="md:col-span-2 flex items-end gap-2">
                        <button onClick={() => handleUpdatePlan(plan)} disabled={!!btnStatus[`save-${plan.id}`]}
                          className="bg-success text-success-foreground px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-colors disabled:opacity-70 min-w-[60px]">
                          {btnStatus[`save-${plan.id}`] || "保存"}
                        </button>
                        <button onClick={() => handleDeletePlan(plan.id)}
                          className="bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-xs font-bold hover:bg-destructive/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {plans.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">暂无套餐，点击上方"添加套餐"创建</div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* 订单管理 */}
          <TabsContent value="orders">
            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
              <h2 className="text-xl font-bold mb-6 flex items-center text-accent border-b border-border pb-3">
                <ClipboardList className="w-5 h-5 mr-2" /> 订单管理
              </h2>

              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="搜索 UUID / 套餐名 / 邮箱..."
                    value={ordersSearch}
                    onChange={e => setOrdersSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { setOrdersPage(1); loadOrders(1, ordersSearch, ordersStatus); } }}
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-accent outline-none text-sm"
                  />
                </div>
                <select
                  value={ordersStatus}
                  onChange={e => { setOrdersStatus(e.target.value); setOrdersPage(1); loadOrders(1, ordersSearch, e.target.value); }}
                  className="border border-input px-3 py-2 rounded-lg bg-background text-sm focus:ring-2 focus:ring-accent outline-none min-w-[120px]"
                >
                  <option value="all">全部状态</option>
                  <option value="pending">待支付</option>
                  <option value="paid">已支付</option>
                  <option value="fulfilled">已完成</option>
                  <option value="expired">已过期</option>
                </select>
                <button
                  onClick={() => { setOrdersPage(1); loadOrders(1, ordersSearch, ordersStatus); }}
                  className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-colors text-sm"
                >
                  搜索
                </button>
                {selectedOrders.size > 0 && (
                  <button
                    onClick={handleBatchDelete}
                    disabled={!!btnStatus["batchDel"]}
                    className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-colors text-sm disabled:opacity-70 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> {btnStatus["batchDel"] || `删除 (${selectedOrders.size})`}
                  </button>
                )}
              </div>

              {ordersLoading ? (
                <div className="text-center text-muted-foreground py-12">加载中...</div>
              ) : orders.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">暂无订单记录</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="py-3 px-2 w-8">
                            <input type="checkbox" checked={orders.length > 0 && selectedOrders.size === orders.length}
                              onChange={toggleSelectAll} className="w-4 h-4 rounded cursor-pointer" />
                          </th>
                          <th className="py-3 px-2 font-semibold">UUID</th>
                          <th className="py-3 px-2 font-semibold">套餐</th>
                          <th className="py-3 px-2 font-semibold">金额</th>
                          <th className="py-3 px-2 font-semibold">支付方式</th>
                          <th className="py-3 px-2 font-semibold">状态</th>
                          <th className="py-3 px-2 font-semibold">时间</th>
                          <th className="py-3 px-2 font-semibold">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order.id} className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${selectedOrders.has(order.id) ? "bg-accent/5" : ""}`}>
                            <td className="py-3 px-2">
                              <input type="checkbox" checked={selectedOrders.has(order.id)}
                                onChange={() => toggleSelectOrder(order.id)} className="w-4 h-4 rounded cursor-pointer" />
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs max-w-[120px] truncate" title={order.uuid}>{order.uuid.slice(0, 8)}...</span>
                                <button onClick={() => { navigator.clipboard.writeText(order.uuid); }} title="复制 UUID"
                                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                </button>
                              </div>
                              {order.remark && <div className="text-xs text-muted-foreground mt-0.5">📝 {order.remark}</div>}
                            </td>
                            <td className="py-3 px-2">
                              <span className="font-medium">{order.plan_name}</span>
                              <span className="text-muted-foreground text-xs ml-1">({order.months}个月)</span>
                            </td>
                            <td className="py-3 px-2">
                              {order.crypto_amount ? (
                                <span>{order.crypto_amount} {order.crypto_currency}</span>
                              ) : (
                                <span>¥{order.amount}</span>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                order.payment_method === "wechat" ? "bg-success/10 text-success" :
                                order.payment_method === "alipay" ? "bg-primary/10 text-primary" :
                                "bg-accent/10 text-accent"
                              }`}>
                                {order.payment_method === "wechat" ? "微信" :
                                 order.payment_method === "alipay" ? "支付宝" :
                                 order.payment_method === "crypto_usdt" ? "USDT" :
                                 order.payment_method === "crypto_trx" ? "TRX" : order.payment_method}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                order.status === "fulfilled" ? "bg-success/10 text-success" :
                                order.status === "paid" ? "bg-primary/10 text-primary" :
                                order.status === "expired" ? "bg-destructive/10 text-destructive" :
                                "bg-warning/10 text-warning"
                              }`}>
                                {order.status === "fulfilled" ? "✅ 已完成" :
                                 order.status === "paid" ? "💰 已支付" :
                                 order.status === "expired" ? "⏰ 已过期" : "⏳ 待支付"}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(order.created_at).toLocaleString("zh-CN")}
                            </td>
                            <td className="py-3 px-2">
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="bg-destructive/10 text-destructive px-2 py-1 rounded-lg text-xs font-bold hover:bg-destructive/20 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <span className="text-sm text-muted-foreground">共 {ordersTotal} 条记录</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { const p = ordersPage - 1; setOrdersPage(p); loadOrders(p); }}
                        disabled={ordersPage <= 1}
                        className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium px-2">第 {ordersPage} / {Math.max(1, Math.ceil(ordersTotal / 20))} 页</span>
                      <button
                        onClick={() => { const p = ordersPage + 1; setOrdersPage(p); loadOrders(p); }}
                        disabled={ordersPage >= Math.ceil(ordersTotal / 20)}
                        className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}