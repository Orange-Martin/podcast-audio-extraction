// 从服务器安全地获取环境变量状态
(async function() {
    try {
        // 从服务器获取环境变量状态
        const response = await fetch('/api/env-config');
        if (!response.ok) {
            throw new Error('无法获取环境变量状态');
        }
        
        // 获取环境变量状态
        const configStatus = await response.json();
        
        // 创建全局 CONFIG 对象
        window.CONFIG = {
            // 检查是否配置了 API 密钥，但不存储实际的密钥值
            DEEPSEEK_API_KEY_CONFIGURED: configStatus.DEEPSEEK_API_KEY_CONFIGURED,
            RECRAFT_API_KEY_CONFIGURED: configStatus.RECRAFT_API_KEY_CONFIGURED
        };
        
        console.log('环境变量状态加载成功');
        console.log('密钥状态:', {
            'DeepSeek API 密钥已配置': window.CONFIG.DEEPSEEK_API_KEY_CONFIGURED,
            'Recraft API 密钥已配置': window.CONFIG.RECRAFT_API_KEY_CONFIGURED
        });
        
        // 检查是否所有必要的密钥都已配置
        if (!window.CONFIG.DEEPSEEK_API_KEY_CONFIGURED || !window.CONFIG.RECRAFT_API_KEY_CONFIGURED) {
            console.warn('警告: 某些 API 密钥未配置，可能影响功能');
        }
        
        // 触发一个自定义事件，通知其他脚本 CONFIG 已加载完成
        document.dispatchEvent(new Event('config-loaded'));
    } catch (error) {
        console.error('加载环境变量状态失败:', error);
    }
})();
