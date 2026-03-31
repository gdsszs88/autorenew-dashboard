import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    // Load Tawk.to
    if (!(window as any).Tawk_API) {
      (window as any).Tawk_API = {};
      (window as any).Tawk_LoadStart = new Date();
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://embed.tawk.to/69c7635168a74a1c3a60f80a/1jkpdntv2";
      s.charset = "UTF-8";
      s.setAttribute("crossorigin", "*");
      document.body.appendChild(s);
    }
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "什么是静态住宅IP？为什么它能解决AI降智？",
      a: `<p><strong>静态住宅IP</strong>是由真实的互联网服务提供商(ISP)分配给家庭用户的固定IP地址。与机房IP相比，它具有极高的真人属性和信誉度。</p><p>当我们用来访问Gemini、Claude等对环境要求极其严格的AI大模型时，静态住宅IP能够有效避免被风控系统判定为"机器人"或"高风险连接"，从而彻底解决因为IP滥用导致的<strong>AI降智</strong>、回答敷衍、无法登录、频繁跳出人机验证码等问题。</p>`,
    },
    {
      q: "做跨境视频电商（如TikTok），不用住宅IP会怎样？",
      a: `<p>主流短视频平台（如TikTok、Instagram Reels、YouTube）对访问者IP的"真人属性"要求极为苛刻。如果您使用普通的机房代理IP（数据中心IP），平台的风控系统会轻易判定该账号处于异常机器环境，从而对账号进行<strong>隐形限流（Shadowban）</strong>。</p><p>最直接的后果就是您辛苦剪辑发布的视频出现<strong>"0播放"</strong>，或者永远无法触达目标国家（如美区、英区）的本地精准流量池，直播带货时也极易被强行切断。使用我们的原生静态住宅IP，相当于在目标国家拥有一台真实的物理设备，极大提升账号初始权重，保障正常的视频推流与直播效果。</p>`,
    },
    {
      q: "为什么 ChatGPT Plus 充值总是失败或被封号？",
      a: `<p>很多用户在绑定信用卡订阅 <strong>ChatGPT Plus</strong> 或绑定 <strong>OpenAI API</strong> 时，经常遇到"信用卡被拒绝"或充值后秒被封号的问题。这通常不是您的信用卡问题，而是触发了 <strong>Stripe支付网关的风控系统</strong>。</p><p>如果您使用的IP地址是万人骑的机房IP，或者IP所在的地理位置与信用卡发行地不符，Stripe会判定为极高风险的欺诈交易。使用企业级静态住宅IP，为您提供干净、固定、无黑历史的家庭宽带环境，可以大幅提升 Stripe 支付的成功率，保护您的 OpenAI 账号免遭连带封禁。</p>`,
    },
    {
      q: "Claude 批量封号的底层逻辑是什么？如何做到100%防封？",
      a: `<p><strong>Anthropic Claude</strong> 拥有目前业界最严苛的风控策略。很多团队在注册或升级 Claude Pro 后，即使没有违规操作，也会遇到无预警的 <strong>工作区停用（Workspace disabled）</strong> 或批量封号。这主要是因为"IP连带污染"。</p><p>当一个公共节点上有其他用户违规时，Claude 会将该IP段拉黑，所有使用该IP登录的账号都会被"株连"。防封的核心在于<strong>"物理环境隔离"</strong>。我们的独享原生静态IP，确保 <strong>一机一号一IP</strong>，杜绝交叉污染，为您提供高权重的白名单网络环境，是高频使用 Claude 的唯一解。</p>`,
    },
    {
      q: "动态住宅IP、机房IP和静态住宅IP到底有什么区别？",
      a: `<p>为了业务稳定，您必须了解这三者的区别：</p><p><strong>1. 机房IP (Datacenter IP)：</strong>由云服务商（如AWS、阿里云）批量生成的IP。成本极低，但被各种风控系统标记为"机器行为"，无法绕过基本的真人验证（如 Cloudflare 验证码），极易封号。</p><p><strong>2. 动态住宅IP (Dynamic Residential IP)：</strong>真实的家庭宽带IP，但特点是<strong>频繁变动</strong>。每隔几分钟或几小时就会跳到一个新城市的IP。如果用它登录 AI 大模型，系统会认为账号被盗或异地登录，频繁强制要求重新验证，严重影响效率。</p><p><strong>3. 静态独享住宅IP (Static Residential ISP)：</strong>兼具了"家庭宽带的真实高信誉"和"固定不变的稳定性"。IP长时间属于您一人，无论什么时候登录都在同一个物理位置。这是运营海外自媒体矩阵、电商防关联、以及深度依赖 AI 工作流的终极解决方案。</p>`,
    },
    {
      q: "对比普通代理节点，你们的企业级纯净环境有何优势？",
      a: `<p>普通的VPN或代理节点多为数据中心IP（机房IP），且被成千上万的人共享使用。像 ChatGPT、Claude 的风控系统会轻易识别出这些IP的异常，并采取限制措施，导致<strong>Claude封号</strong>或<strong>ChatGPT拒绝服务</strong>。</p><p>我们的纯净原生IP为独享资源，从物理层面上保障了您的网络身份真实有效，不仅速度快、不掉线，更最大程度保障了您宝贵的AI与跨境账号资产安全。</p>`,
    },
    {
      q: "你们的服务支持哪些业务系统的对接？",
      a: `<p>我们提供的是底层网络协议的纯净静态住址环境，因此完美兼容目前市面上绝大部分的业务场景，包括但不限于：<strong>Google Gemini、Anthropic Claude、OpenAI ChatGPT</strong> 及其 API，像 <strong>Cursor</strong> 这种集成AI的开发工具，以及 <strong>TikTok、Shopee、Amazon</strong> 等跨境电商与社媒运营环境的搭建。</p>`,
    },
  ];

  return (
    <>
      <style>{`
        .landing-page {
          --lp-primary: #2b7a3b;
          --lp-primary-hover: #22632f;
          --lp-bg: #f4f7f6;
          --lp-text-dark: #2c3e50;
          --lp-text-gray: #546e7a;
          --lp-card-bg: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
          background-color: var(--lp-bg);
          color: var(--lp-text-dark);
          line-height: 1.6;
          overflow-x: hidden;
        }
        .landing-page * { margin: 0; padding: 0; box-sizing: border-box; }
        .lp-header { background-color: var(--lp-card-bg); box-shadow: 0 2px 10px rgba(0,0,0,0.05); padding: 15px 5%; display: flex; align-items: center; justify-content: center; position: sticky; top: 0; z-index: 100; }
        .lp-logo { font-size: 1.5rem; font-weight: 800; color: var(--lp-primary); text-decoration: none; display: flex; align-items: center; gap: 10px; position: absolute; left: 5%; }
        .lp-logo-icon { width: 32px; height: 32px; background-color: var(--lp-primary); color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 18px; }
        .lp-nav-link { display: inline-block; padding: 15px 36px; background-color: var(--lp-primary); color: white; text-decoration: none; border-radius: 30px; font-size: 1.5rem; font-weight: 700; box-shadow: 0 4px 12px rgba(43,122,59,0.3); transition: all 0.3s ease; }
        .lp-nav-link:hover { background-color: var(--lp-primary-hover); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(43,122,59,0.4); }
        .lp-hero { display: flex; align-items: center; justify-content: space-between; padding: 80px 5%; max-width: 1400px; margin: 0 auto; gap: 50px; }
        .lp-hero-content { flex: 1; max-width: 600px; }
        .lp-tagline { display: inline-block; background-color: rgba(43,122,59,0.1); color: var(--lp-primary); padding: 6px 16px; border-radius: 20px; font-size: 0.9rem; font-weight: 600; margin-bottom: 20px; }
        .lp-hero h1 { font-size: 3rem; line-height: 1.2; margin-bottom: 24px; color: #1a202c; }
        .lp-hero h1 span { color: #e53e3e; }
        .lp-hero p { font-size: 1.15rem; color: var(--lp-text-gray); margin-bottom: 15px; }
        .lp-hero-features { list-style: none; margin: 25px 0; padding: 0; }
        .lp-hero-features li { position: relative; padding-left: 30px; margin-bottom: 12px; font-size: 1.05rem; color: var(--lp-text-dark); }
        .lp-hero-features li::before { content: '✓'; position: absolute; left: 0; top: 0; color: var(--lp-primary); font-weight: bold; font-size: 1.2rem; }
        .lp-hero-image { flex: 1; text-align: right; }
        .lp-hero-image img { max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); border: 8px solid white; transform: rotate(2deg); transition: transform 0.3s ease; }
        .lp-hero-image img:hover { transform: rotate(0deg) scale(1.02); }
        .lp-supported { text-align: center; padding: 40px 5%; background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
        .lp-supported h2 { font-size: 1.1rem; color: #718096; font-weight: 600; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
        .lp-model-tags { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
        .lp-model-tag { background: white; padding: 10px 25px; border-radius: 30px; font-weight: bold; color: #4a5568; box-shadow: 0 2px 10px rgba(0,0,0,0.05); font-size: 1.1rem; }
        .lp-features-section { background-color: white; padding: 80px 5%; }
        .lp-section-title { text-align: center; font-size: 2.2rem; margin-bottom: 50px; color: #1a202c; }
        .lp-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; max-width: 1200px; margin: 0 auto; }
        .lp-feature-card { background: var(--lp-bg); padding: 40px 30px; border-radius: 16px; text-align: center; transition: transform 0.3s ease, box-shadow 0.3s ease; border: 1px solid #e2e8f0; }
        .lp-feature-card:hover { transform: translateY(-10px); box-shadow: 0 15px 30px rgba(0,0,0,0.08); background: white; border-color: var(--lp-primary); }
        .lp-feature-icon { width: 70px; height: 70px; background-color: rgba(43,122,59,0.1); color: var(--lp-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .lp-feature-icon svg { width: 35px; height: 35px; }
        .lp-feature-card h3 { font-size: 1.4rem; margin-bottom: 15px; color: #2d3748; }
        .lp-feature-card p { color: var(--lp-text-gray); font-size: 1rem; }
        .lp-seo-section { padding: 60px 5%; background-color: var(--lp-bg); max-width: 1000px; margin: 0 auto; }
        .lp-seo-title { text-align: center; font-size: 1.8rem; margin-bottom: 30px; color: #1a202c; }
        .lp-faq-item { background: white; border-radius: 10px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden; border: 1px solid #e2e8f0; }
        .lp-faq-question { padding: 20px; font-size: 1.1rem; font-weight: 600; color: #2d3748; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.3s; }
        .lp-faq-question:hover { background-color: #f8fafc; }
        .lp-faq-icon { width: 20px; height: 20px; transition: transform 0.3s ease; fill: var(--lp-text-gray); }
        .lp-faq-item.active .lp-faq-icon { transform: rotate(180deg); fill: var(--lp-primary); }
        .lp-faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.4s ease-out; background-color: white; }
        .lp-faq-answer-inner { padding: 0 20px 20px; color: var(--lp-text-gray); line-height: 1.7; font-size: 1rem; border-top: 1px dashed #e2e8f0; margin-top: 10px; padding-top: 15px; }
        .lp-faq-answer-inner p { margin-bottom: 10px; }
        .lp-faq-item.active .lp-faq-answer { max-height: 500px; }
        .lp-footer { text-align: center; padding: 40px 20px; background-color: #1a202c; color: #a0aec0; }
        @media (max-width: 992px) {
          .lp-features-grid { grid-template-columns: repeat(2, 1fr); }
          .lp-hero { flex-direction: column-reverse; text-align: center; padding: 40px 5%; }
          .lp-hero-content { max-width: 100%; }
          .lp-hero-features { text-align: left; display: inline-block; }
          .lp-hero h1 { font-size: 2.5rem; }
          .lp-hero-image { margin-bottom: 30px; }
          .lp-hero-image img { transform: rotate(0); }
          .lp-fab-container { right: 15px; }
        }
        @media (max-width: 768px) {
          .lp-features-grid { grid-template-columns: 1fr; }
          .lp-hero h1 { font-size: 2rem; }
        }
      `}</style>

      <div className="landing-page">
        {/* Header */}
        <header className="lp-header">
          <a href="#" className="lp-logo">
            <div className="lp-logo-icon">IP</div>
            静态住址服务
          </a>
          <Link to="/portal" className="lp-nav-link">
            充值与续费
          </Link>
        </header>

        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-hero-content">
            <span className="lp-tagline">专业解锁 AI 与 跨境出海 满血模式</span>
            <h1>专业解决 AI 降智<br />拒绝限流与 <span>"人工智障"</span>！</h1>
            <p>专门解决 <strong>Gemini、Claude、Cursor</strong> 等 AI 大模型回答降级封号问题，以及 <strong>TikTok、YouTube</strong> 等跨境视频电商 <strong>限流、0播放</strong> 难题。</p>
            <ul className="lp-hero-features">
              <li>完美解锁AI满血模式，解决验证码频繁跳出</li>
              <li>防平台风控，彻底告别跨境电商IP变动风险</li>
              <li>原生真实物理节点，保障账号高权重与推流</li>
            </ul>
          </div>
          <div className="lp-hero-image">
            <img src="https://free.picui.cn/free/2026/03/28/69c75f365413d.png" alt="企业级静态住宅IP，专业解决AI降智、Claude封号、跨境短视频限流问题" />
          </div>
        </section>

        {/* Supported Models */}
        <section className="lp-supported">
          <h2>完美支持主流 AI 大模型与跨境内容平台</h2>
          <div className="lp-model-tags">
            <div className="lp-model-tag" style={{ color: "#4285f4" }}>✨ Gemini</div>
            <div className="lp-model-tag" style={{ color: "#d97757" }}>🤖 Claude</div>
            <div className="lp-model-tag" style={{ color: "#111" }}>💻 Cursor</div>
            <div className="lp-model-tag" style={{ color: "#000" }}>🎵 TikTok</div>
            <div className="lp-model-tag" style={{ color: "#FF0000" }}>▶️ YouTube</div>
          </div>
        </section>

        {/* Features */}
        <section className="lp-features-section" id="features">
          <h2 className="lp-section-title">为什么选择我们的企业级网络？</h2>
          <div className="lp-features-grid">
            <div className="lp-feature-card">
              <div className="lp-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
              <h3>静态住址 (固定不变)</h3>
              <p>为您提供绝对固定的原生IP，完美适用于企业系统对接、远程办公环境，彻底解决动态IP带来的风控封号危机。</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <h3>AI 企业级纯净环境</h3>
              <p>从源头保证资源干净、低风控。专为需要高信誉网络环境的合规业务量身打造，告别各类人机验证（CAPTCHA）。</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
              </div>
              <h3>跨境视频防限流</h3>
              <p>专为 TikTok、YouTube 等平台打造。规避普通机房IP造成的视频"0播放"、直播卡顿等问题，保障账号高权重正常推流。</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </div>
              <h3>合法合规经营</h3>
              <p>服务由正规合法备案企业提供，完全符合国家各项网络安全规范。保障您的企业级业务稳定、长效、安心运营。</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              </div>
              <h3>极速响应与高并发</h3>
              <p>采用企业级高速路由专线直连，超低延迟。完美支持多线程并发 API 请求与高清视频矩阵推流，晚高峰依然稳如泰山。</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
              </div>
              <h3>7×24 技术专家支持</h3>
              <p>提供全天候 1v1 专属售后服务。无论是底层环境配置、路由分流，还是突发风控问题，我们的工程师团队随时为您保驾护航。</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="lp-seo-section">
          <h2 className="lp-seo-title">关于静态住宅IP与AI降智、跨境出海的常见疑问</h2>
          {faqs.map((faq, i) => (
            <div key={i} className={`lp-faq-item ${activeFaq === i ? "active" : ""}`}>
              <div className="lp-faq-question" onClick={() => toggleFaq(i)}>
                {faq.q}
                <svg className="lp-faq-icon" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z" /></svg>
              </div>
              <div className="lp-faq-answer">
                <div className="lp-faq-answer-inner" dangerouslySetInnerHTML={{ __html: faq.a }} />
              </div>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="lp-footer">
          <p>© 2024-2026 静态住址服务提供商. 版权所有.</p>
          <p style={{ marginTop: "10px", fontSize: "0.85rem", color: "#718096" }}>合规经营，符合国家网络安全规范 | 专业解决 AI 降智、防跨境电商限流</p>
        </footer>

        {/* FAB buttons */}
        <div className="lp-fab-container" id="contact">
          <button
            className="lp-fab chat"
            onClick={() => {
              const api = (window as any).Tawk_API;
              if (api && typeof api.maximize === "function") api.maximize();
            }}
          >
            <span className="lp-fab-tooltip">在线咨询</span>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3c5.5 0 10 3.58 10 8s-4.5 8-10 8c-1.24 0-2.43-.2-3.53-.55C6.15 19.88 3.5 20.5 3.5 20.5s.8-2.3.96-3.41C3.18 15.69 2 13.96 2 11c0-4.42 4.5-8 10-8z" />
            </svg>
          </button>

          <a href="javascript:void(0);" className="lp-fab qq">
            <div className="lp-qr-popup">
              <img src="https://free.picui.cn/free/2026/01/15/6968e65e9a443.png" alt="QQ客服二维码" />
              <span className="qr-text">扫码添加QQ客服</span>
            </div>
            <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
              <path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.2 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.3-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z" />
            </svg>
          </a>

          <a href="https://t.me/zhenghongcheng" className="lp-fab tg" target="_blank" rel="noopener noreferrer">
            <span className="lp-fab-tooltip">点击Telegram联系</span>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.11.03-1.84 1.18-5.2 3.45-.49.34-.94.5-1.35.49-.45-.01-1.32-.26-1.96-.47-.79-.26-1.42-.39-1.36-.83.03-.22.34-.45.93-.69 3.63-1.58 6.06-2.63 7.28-3.13 3.47-1.43 4.19-1.68 4.66-1.69.1 0 .34.02.49.13.12.1.16.23.18.33.01.07.02.16.02.21z" />
            </svg>
          </a>
        </div>
      </div>
    </>
  );
}
