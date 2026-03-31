import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Server, QrCode, Bitcoin, CheckCircle2, Plus, Trash2, Package } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAdminConfig, saveAdminConfig, testPanelConnection, adminGetPlans, adminCreatePlan, adminUpdatePlan, adminDeletePlan } from "@/lib/api";

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
};

export default function AdminDashboard() {
  const [config, setConfig] = useState<AdminConfigData>(defaultConfig);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [btnStatus, setBtnStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
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
          <TabsList className="w-full grid grid-cols-3 h-12 bg-card border border-border rounded-2xl p-1">
            <TabsTrigger value="panel" className="rounded-xl data-[state=active]:bg-admin-primary data-[state=active]:text-admin-primary-foreground font-bold">
              <Server className="w-4 h-4 mr-2" /> 面板对接配置
            </TabsTrigger>
            <TabsTrigger value="payment" className="rounded-xl data-[state=active]:bg-warning data-[state=active]:text-warning-foreground font-bold">
              <QrCode className="w-4 h-4 mr-2" /> 支付网关
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-xl data-[state=active]:bg-client-primary data-[state=active]:text-client-primary-foreground font-bold">
              <Package className="w-4 h-4 mr-2" /> 商品管理
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
        </Tabs>
      </div>
    </div>
  );
}