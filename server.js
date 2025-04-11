// 简单的 Express 服务器，使用 OpenAI 客户端调用 Recraft API
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const axios = require('axios'); // 需要安装: npm install axios

// 加载环境变量
const envPath = path.resolve(__dirname, '.env.local');
let envConfig = {};

// 首先检查 process.env 中是否有环境变量（Vercel 部署环境）
if (process.env.DEEPSEEK_API_KEY) {
    envConfig.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    console.log('从 process.env 加载 DeepSeek API 密钥成功');
}

if (process.env.RECRAFT_API_KEY) {
    envConfig.RECRAFT_API_KEY = process.env.RECRAFT_API_KEY;
    console.log('从 process.env 加载 Recraft API 密钥成功');
}

// 如果 process.env 中没有找到环境变量，尝试从本地文件加载（本地开发环境）
if ((!envConfig.DEEPSEEK_API_KEY || !envConfig.RECRAFT_API_KEY) && fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const lines = envFile.split('\n');
    
    lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length === 2) {
            const key = parts[0].trim();
            const value = parts[1].trim();
            if (key && value && !envConfig[key]) {
                envConfig[key] = value;
            }
        }
    });
    console.log('从本地文件加载环境变量成功');
} else if (!envConfig.DEEPSEEK_API_KEY && !envConfig.RECRAFT_API_KEY) {
    console.warn('警告: 未找到环境变量，既不在 process.env 中也不在 .env.local 文件中');
}

const app = express();
const PORT = process.env.PORT || 3000;

// 使用 body-parser 解析 JSON 请求体
app.use(bodyParser.json());

// 静态文件服务
app.use(express.static(__dirname));

// API 端点，安全地提供环境变量状态
app.get('/api/env-config', (req, res) => {
    // 只提供环境变量的状态，不返回实际的密钥值
    res.json({
        // 只返回是否配置了密钥，而不返回密钥本身
        DEEPSEEK_API_KEY_CONFIGURED: !!envConfig.DEEPSEEK_API_KEY,
        RECRAFT_API_KEY_CONFIGURED: !!envConfig.RECRAFT_API_KEY
    });
});

// 使用 OpenAI 客户端调用 Recraft API
app.post('/api/generate-image', async (req, res) => {
    try {
        console.log('收到图片生成请求');
        console.log('请求体:', req.body);
        
        // 从环境变量中获取 API 密钥
        const apiKey = envConfig.RECRAFT_API_KEY;
        
        if (!apiKey) {
            return res.status(400).json({ error: 'Recraft API 密钥未配置' });
        }
        
        // 准备请求数据，直接按照 Recraft API 的格式
        const requestData = {
            prompt: req.body.prompt,
            style: req.body.style || 'digital_illustration',
            model: req.body.model || 'recraftv3', // 使用 recraftv3 以减少消耗
            substyle: req.body.substyle || 'grain' // 直接在顶层添加 substyle
        };
        
        // 添加可选参数
        if (req.body.negative_prompt) {
            requestData.negative_prompt = req.body.negative_prompt;
        }
        
        if (req.body.size) {
            requestData.size = req.body.size;
        }
        
        if (req.body.num_images) {
            requestData.n = req.body.num_images;
        }
        
        console.log('请求数据:', requestData);
        
        // 使用 axios 直接调用 Recraft API
        const response = await axios({
            method: 'post',
            url: 'https://external.api.recraft.ai/v1/images/generations',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            data: requestData
        });
        
        console.log('生成的图片响应状态:', response.status);
        console.log('生成的图片响应数据:', response.data);
        
        // 返回生成的图片结果
        res.json(response.data);
    } catch (error) {
        console.error('图片生成错误:', error.message);
        console.error('错误详情:', error);
        
        // 返回错误信息
        res.status(500).json({
            error: error.message,
            details: error.response?.data || {}
        });
    }
});

// 添加 DeepSeek API 优化提示词端点
app.post('/api/optimize-prompt', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: '提示词不能为空' });
        }
        
        if (!envConfig.DEEPSEEK_API_KEY) {
            return res.status(500).json({ error: 'DeepSeek API 密钥未配置' });
        }
        
        // 使用 axios 调用 DeepSeek API
        const response = await axios({
            method: 'post',
            url: 'https://api.deepseek.com/v1/chat/completions',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${envConfig.DEEPSEEK_API_KEY}`
            },
            data: {
                model: 'deepseek-chat',  // 使用 DeepSeek 的聊天模型
                messages: [
                    {
                        role: 'system',
                        content: '你是一位专业的 AI 文生图提示词优化师，擅长将简单的描述转化为详细、具体、有效的提示词。'
                    },
                    {
                        role: 'user',
                        content: ` ## Profile
        你是一位经验丰富、视野开阔的设计顾问和创意指导，对各领域的视觉美学和用户体验有深刻理解。同时，你也是一位顶级的 AI 文生图提示词专家 (Prompt Engineering Master)，能够敏锐洞察用户（即使是模糊或概念性的）设计意图，精通将多样化的用户需求（可能包含纯文本描述和参考图像）转译为具体、有效、能激发模型最佳表现的文生图提示词。

        ## Core Mission
        - 你的核心任务是接收用户提供的任何类型的设计需求，基于对文生图模型能力边界的深刻理解进行处理。
        - 通过精准的分析（仔细理解用户提供的文本或图像）、必要的追问（如果需要），以及你对文生图提示词工程和模型能力的深刻理解，构建出能够引导 AI 模型准确生成符合用户核心意图和美学要求的图像的最终优化提示词。
        - 强调对用户完整意图的精准把握，理解文生图模型能力边界，并采用最有效的文生图提示词引导策略来处理精确性要求，最终激发模型潜力。

        ## Input Handling
        - 接受多样化输入: 准备好处理纯文本描述/关键词列表/参考图像，或文本与图像的组合。
        - 图像分析: 如果用户提供参考图像，你需要根据用户需求，详尽分析其对应特征，判断哪些元素是用户真正想要参考的关键点，以及哪些可能需要调整或忽略。

        ## Key Responsibilities
        1.  需求解析: 全面理解用户输入（文本和/或图像），洞察任何隐含要求，识别是否存在歧义、冲突。
        2.  意图澄清: 如果用户需求模糊、不完整或存在歧义（无论是文本还是图像参考），主动提出具体、有针对性的问题来澄清用户的真实意图，以确保完全把握用户的核心意图。
        3.  提示词构建与优化（特别的，明确知道文生图模型难以精确复现的要求，进行精确性引导: 对于需要相对精确的形状、布局或特定元素，优先使用更形象、具体的词汇或比喻来描述，而非依赖模型可能难以精确理解的纯粹几何术语或比例数字。）
        4.  输出交付:
            *   提供最终优化后的高质量英文提示词，不要包含任何解释或其他文字。

        ## Guiding Principles
        *   精准性:力求每个词都服务于最终的视觉呈现。
        *   细节化:尽可能捕捉和转化用户需求中的细节。
        *   结构化:提示词应具有清晰的逻辑结构。
        *   用户中心:最终目标是如实反映用户的设计意图。

        ## Interaction Style
        专业、耐心、细致、具有启发性。在必要时主动引导用户思考，以获取更清晰的需求。

        ## 参考输出格式示例
        以下为一个优秀的输出格式的示例：

        一个意式浓缩咖啡机艺术品，融合了流线型现代主义的优雅曲线与未来主义的极简精准。其主体采用大面积、无缝连接的镜面抛光铬金属，呈现出流体雕塑般的形态，侧面过渡至细腻拉丝纹理的钛灰色不锈钢面板，形成微妙的光泽对比。底座与散热格栅采用哑光黑色阳极氧化铝，增加了视觉的稳定感与深度。<br>
        咖啡机上一个悬浮式设计的冲煮头，仿佛从主体优雅地延伸出来；一个复古风格、精密如瑞士钟表表盘的圆形模拟压力表，带有柔和的内部背光；控制旋钮采用实心金属打造，边缘点缀一圈极细的温暖黄铜环，转动时提供令人愉悦的物理阻尼感。<br>
        水箱巧妙地隐藏在机身侧后方，通过一条狭长的烟熏色玻璃视窗显示水位，玻璃表面带有垂直的微棱纹理。蒸汽棒关节处采用精密球形接头，转动顺滑。<br>
        咖啡手柄采用与主体一致的抛光铬金属，搭配经过人体工学设计的黑色胡桃木握柄。<br><br>
        整体造型极简，无多余装饰，所有线条和接缝都经过精心处理，体现了“少即是多”的设计哲学与顶级的制造工艺，散发出一种冷静、专业、又饱含温度的永恒奢华感。<br><br>
        白色背景，陶瓷质感桌面，采用柔和的、略带方向性的工作室灯光（营造更强的立体感和光泽），高分辨率，3D建模渲染，光影效果极其逼真，太阳光暖光质感，自然光泽，清晰逼真，细节丰富到微米级别。中性背景下的清晰产品摄影风格。

        请优化以下提示词，使其更适合用于AI图像生成。提示词应该详细、具体、富有描述性，并包含风格、氛围、光照等元素。请确保优化后的提示词是英文的，因为英文提示词通常能获得更好的效果。只输出优化后的提示词，不要包含任何解释或其他文字。原始提示词：${prompt}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            }
        });
        
        // 提取优化后的提示词
        const optimizedPrompt = response.data.choices[0].message.content;
        
        res.json({ optimizedPrompt });
    } catch (error) {
        console.error('优化提示词时出错:', error.response?.data || error.message);
        res.status(500).json({ 
            error: '优化提示词失败', 
            details: error.response?.data || error.message 
        });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`图片生成端点可通过 http://localhost:${PORT}/api/generate-image 访问`);
});
