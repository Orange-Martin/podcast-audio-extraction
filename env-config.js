// 从服务器安全地获取环境变量状态
(async function() {
    try {
        console.log('开始加载环境变量状态...');
        
        // 添加重试逻辑
        let retries = 3;
        let configStatus = null;
        
        while (retries > 0) {
            try {
                // 从服务器获取环境变量状态
                console.log(`尝试获取环境变量状态，剩余重试次数: ${retries}`);
                const response = await fetch('/api/env-config');
                
                if (!response.ok) {
                    throw new Error(`服务器响应状态码: ${response.status}`);
                }
                
                // 获取环境变量状态
                configStatus = await response.json();
                console.log('成功获取环境变量状态:', configStatus);
                break; // 成功获取数据，退出循环
            } catch (fetchError) {
                console.warn(`获取环境变量失败，错误: ${fetchError.message}`);
                retries--;
                
                if (retries > 0) {
                    // 等待一秒后重试
                    console.log('等待 1 秒后重试...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        // 如果所有重试都失败，使用默认值
        if (!configStatus) {
            console.warn('所有重试都失败，使用默认配置');
            configStatus = {
                DEEPSEEK_API_KEY_CONFIGURED: false,
                RECRAFT_API_KEY_CONFIGURED: false
            };
        }
        
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
        // 创建默认配置
        window.CONFIG = {
            DEEPSEEK_API_KEY_CONFIGURED: false,
            RECRAFT_API_KEY_CONFIGURED: false
        };
        // 即使出错也触发事件，以便应用可以继续运行
        document.dispatchEvent(new Event('config-loaded'));
    }
})();
