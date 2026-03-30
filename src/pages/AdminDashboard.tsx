import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Server, DollarSign, QrCode, Bitcoin, CheckCircle2 } from "lucide-react";
import { getAdminConfig, saveAdminConfig, testPanelConnection } from "@/lib/api";

interface AdminConfigData {
  panelUrl: string;
  panelUser: string;
  panelPass: string;
  priceMonth: number;
  priceQuarter: number;
  priceYear: number;
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

const defaultConfig: AdminConfigData = {
  panelUrl: "http://127.0.0.1:2053",
  panelUser: "admin",
  panelPass: "",
  priceMonth: 15,
  priceQuarter: 40,
  priceYear: 150,
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
  const [saveStatus, setSaveStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = sessionStorage.getItem("admin_token") || "";

  useEffect(() => {
    if (!token) {
      navigate("/admin");
      return;
    }
    loadConfig();
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

  const handleSave = async () => {
    setSaveStatus("正在保存...");
    try {
      await saveAdminConfig(token, config);
      setSaveStatus("配置已保存并实时生效！");
    } catch {
      setSaveStatus("保存失败，请重试");
    }
    setTimeout(() => setSaveStatus(""), 3000);
  };

  const handleTest = async () => {
    setSaveStatus("正在测试连接...");
    try {
      const res = await testPanelConnection(token, config.panelUrl, config.panelUser, config.panelPass);
      setSaveStatus(res?.success ? "连接 3x-ui 面板成功！" : `连接失败: ${res?.error || "未知错误"}`);
    } catch {
      setSaveStatus("连接测试失败");
    }
    setTimeout(() => setSaveStatus(""), 5000);
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

        {saveStatus && (
          <div className="bg-success/10 border border-success/30 text-success px-4 py-3 rounded-xl flex items-center shadow-sm">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            {saveStatus}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 面板对接 */}
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
                <button onClick={handleTest} className="flex-1 bg-secondary text-secondary-foreground py-2.5 rounded-lg font-bold hover:opacity-90 transition-colors border border-border">
                  测试连接
                </button>
                <button onClick={handleSave} className="flex-1 bg-admin-primary text-admin-primary-foreground py-2.5 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md">
                  保存配置
                </button>
              </div>
            </div>
          </div>

          {/* 套餐价格 */}
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
            <h2 className="text-xl font-bold mb-6 flex items-center text-success border-b border-border pb-3">
              <DollarSign className="w-5 h-5 mr-2" /> 套餐价格设置 (人民币)
            </h2>
            <div className="space-y-5">
              {[
                { label: "月付 (30天)", key: "priceMonth" as const },
                { label: "季付 (90天)", key: "priceQuarter" as const },
                { label: "年付 (365天)", key: "priceYear" as const },
              ].map(item => (
                <div key={item.key} className="flex items-center space-x-4 bg-muted p-3 rounded-lg border border-border">
                  <label className="w-24 text-sm font-bold">{item.label}</label>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">¥</span>
                    <input type="number" value={config[item.key]} onChange={e => setConfig({ ...config, [item.key]: Number(e.target.value) })}
                      className="w-full border border-input p-2.5 pl-8 rounded-lg focus:ring-2 focus:ring-success outline-none bg-background" />
                  </div>
                </div>
              ))}
              <button onClick={handleSave} className="w-full bg-success text-success-foreground py-3 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md flex justify-center items-center">
                <CheckCircle2 className="w-5 h-5 mr-2" /> 同步至客户前台
              </button>
            </div>
          </div>

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
              <button onClick={handleSave} className="w-full bg-warning text-warning-foreground py-3 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md flex justify-center items-center">
                <CheckCircle2 className="w-5 h-5 mr-2" /> 保存支付配置
              </button>
            </div>
          </div>

          {/* 虚拟货币 */}
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
            <h2 className="text-xl font-bold mb-6 flex items-center text-accent border-b border-border pb-3">
              <Bitcoin className="w-5 h-5 mr-2" /> 虚拟货币设置 (TronGrid)
            </h2>
            <div className="space-y-4">
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
              <div className="bg-accent/10 text-accent text-xs p-3 rounded-lg mt-2 border border-accent/20">
                <span className="font-bold">💡 防撞单机制已启用：</span>
                客户使用虚拟货币付款时，系统会自动在原价基础上加上 <b>0.001 - 0.0019</b> 的随机尾数以唯一标识订单。
              </div>
              <button onClick={handleSave} className="w-full bg-accent text-accent-foreground py-3 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md flex justify-center items-center">
                <CheckCircle2 className="w-5 h-5 mr-2" /> 保存加密货币配置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
