const { Plugin, PluginSettingTab, Setting, Notice, requestUrl } = require('obsidian');

const DEFAULT_SETTINGS = {
	provider: 'deepseek',
	deepseekKey: '',
	deepseekModel: 'deepseek-chat',
	qwenKey: '',
	qwenModel: 'qwen-plus',
	doubaoKey: '',
	doubaoModel: '',
	geminiKey: '',
	geminiModel: 'gemini-2.5-flash',
	openaiKey: '',
	openaiModel: 'gpt-4o',
	claudeKey: '',
	claudeModel: 'claude-3-7-sonnet-latest',
	siliconflowKey: '',
	siliconflowModel: 'deepseek-ai/DeepSeek-V3',
	moonshotKey: '',
	moonshotModel: 'moonshot-v1-auto',
	zhipuKey: '',
	zhipuModel: 'glm-4-plus',
	openrouterKey: '',
	openrouterModel: 'deepseek/deepseek-chat',
	groqKey: '',
	groqModel: 'llama-3.3-70b-versatile',
	customUrl: '',
	customKey: '',
	customModel: '',
	systemPrompt: '',
	targetLanguage: 'Chinese'
};

class Translator {
	constructor(settings) {
		this.settings = settings;
	}

	updateSettings(settings) {
		this.settings = settings;
	}

	async translate(text) {
		let url = '';
		let model = '';
		let apiKey = '';

		switch (this.settings.provider) {
			case 'deepseek':
				url = 'https://api.deepseek.com/chat/completions';
				model = this.settings.deepseekModel || 'deepseek-chat';
				apiKey = this.settings.deepseekKey;
				break;
			case 'qwen':
				url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
				model = this.settings.qwenModel || 'qwen-plus';
				apiKey = this.settings.qwenKey;
				break;
			case 'doubao':
				url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
				model = this.settings.doubaoModel; // User enters Endpoint ID
				apiKey = this.settings.doubaoKey;
				break;
			case 'gemini':
				url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
				model = this.settings.geminiModel || 'gemini-2.5-flash';
				apiKey = this.settings.geminiKey;
				break;
			case 'openai':
				url = 'https://api.openai.com/v1/chat/completions';
				model = this.settings.openaiModel || 'gpt-4o';
				apiKey = this.settings.openaiKey;
				break;
			case 'claude':
				url = 'https://api.anthropic.com/v1/messages';
				model = this.settings.claudeModel || 'claude-3-7-sonnet-latest';
				apiKey = this.settings.claudeKey;
				break;
			case 'siliconflow':
				url = 'https://api.siliconflow.cn/v1/chat/completions';
				model = this.settings.siliconflowModel || 'deepseek-ai/DeepSeek-V3';
				apiKey = this.settings.siliconflowKey;
				break;
			case 'moonshot':
				url = 'https://api.moonshot.cn/v1/chat/completions';
				model = this.settings.moonshotModel || 'moonshot-v1-auto';
				apiKey = this.settings.moonshotKey;
				break;
			case 'zhipu':
				url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
				model = this.settings.zhipuModel || 'glm-4-plus';
				apiKey = this.settings.zhipuKey;
				break;
			case 'openrouter':
				url = 'https://openrouter.ai/api/v1/chat/completions';
				model = this.settings.openrouterModel || 'deepseek/deepseek-chat';
				apiKey = this.settings.openrouterKey;
				break;
			case 'groq':
				url = 'https://api.groq.com/openai/v1/chat/completions';
				model = this.settings.groqModel || 'llama-3.3-70b-versatile';
				apiKey = this.settings.groqKey;
				break;
			case 'custom':
				url = this.settings.customUrl;
				model = this.settings.customModel;
				apiKey = this.settings.customKey;
				break;
		}

		if (this.settings.provider === 'custom' && !url) {
			throw new Error('Custom API URL not set');
		}

		if (!apiKey && this.settings.provider !== 'custom') {
			throw new Error('API Key not set');
		}

		if (this.settings.provider === 'doubao' && (!model || !model.trim())) {
			throw new Error('Doubao Endpoint ID (Model) not set');
		}

		if (!model || model === '__custom__') {
			throw new Error('Please enter or select a valid Model ID');
		}

		const targetLang = (this.settings.targetLanguage && this.settings.targetLanguage.trim() && this.settings.targetLanguage !== 'custom')
			? this.settings.targetLanguage.trim()
			: 'Chinese';
		const customPrompt = (this.settings.systemPrompt && this.settings.systemPrompt.trim()) ? this.settings.systemPrompt.trim() : '';
		const systemPrompt = customPrompt ||
			`You are a professional translation assistant. Please directly translate the input text into ${targetLang}. Do not output any explanations, comments, or extra words, only output the translation result.`;

		let requestBody;
		const headers = {
			'Content-Type': 'application/json'
		};

		if (apiKey) {
			if (this.settings.provider === 'claude') {
				headers['x-api-key'] = apiKey;
				headers['anthropic-version'] = '2023-06-01';
			} else {
				headers['Authorization'] = `Bearer ${apiKey}`;
			}
		}

		if (this.settings.provider === 'claude') {
			requestBody = {
				model: model,
				system: systemPrompt,
				messages: [
					{
						role: "user",
						content: text
					}
				],
				max_tokens: 4096
			};
		} else {
			requestBody = {
				model: model,
				messages: [
					{
						role: "system",
						content: systemPrompt
					},
					{
						role: "user",
						content: text
					}
				],
				stream: false
			};
		}

		const requestParam = {
			url: url,
			method: 'POST',
			headers: headers,
			body: JSON.stringify(requestBody)
		};

		try {
			const response = await requestUrl(requestParam);

			if (response.status !== 200) {
				let errorMsg = `API Error: ${response.status}`;
				try {
					if (response.json && response.json.error && response.json.error.message) {
						errorMsg += ` - ${response.json.error.message}`;
					} else if (response.json && response.json.error && typeof response.json.error === 'string') {
						errorMsg += ` - ${response.json.error}`;
					}
				} catch (e) {
					// ignore json parse error
				}
				throw new Error(errorMsg);
			}

			const data = response.json;
			if (this.settings.provider === 'claude') {
				if (!data.content || data.content.length === 0) {
					throw new Error('No translation returned from API');
				}
				return data.content[0].text.trim();
			} else {
				if (!data.choices || data.choices.length === 0) {
					throw new Error('No translation returned from API');
				}
				return data.choices[0].message.content.trim();
			}
		} catch (error) {
			console.error('Translation Error:', error);
			throw error;
		}
	}

	async testConnection(provider, apiKey, model) {
		if (provider !== 'custom' && (!apiKey || !apiKey.trim())) {
			return { success: false, message: 'Please enter API Key first' };
		}
		if (provider === 'doubao' && (!model || !model.trim())) {
			return { success: false, message: 'Please enter Doubao Endpoint ID' };
		}

		let url = '';
		let targetModel = model;

		switch (provider) {
			case 'deepseek':
				url = 'https://api.deepseek.com/chat/completions';
				targetModel = model || 'deepseek-chat';
				break;
			case 'qwen':
				url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
				targetModel = model || 'qwen-plus';
				break;
			case 'doubao':
				url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
				break;
			case 'gemini':
				url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
				targetModel = model || 'gemini-2.5-flash';
				break;
			case 'openai':
				url = 'https://api.openai.com/v1/chat/completions';
				targetModel = model || 'gpt-4o';
				break;
			case 'claude':
				url = 'https://api.anthropic.com/v1/messages';
				targetModel = model || 'claude-3-7-sonnet-latest';
				break;
			case 'siliconflow':
				url = 'https://api.siliconflow.cn/v1/chat/completions';
				targetModel = model || 'deepseek-ai/DeepSeek-V3';
				break;
			case 'moonshot':
				url = 'https://api.moonshot.cn/v1/chat/completions';
				targetModel = model || 'moonshot-v1-auto';
				break;
			case 'zhipu':
				url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
				targetModel = model || 'glm-4-plus';
				break;
			case 'openrouter':
				url = 'https://openrouter.ai/api/v1/chat/completions';
				targetModel = model || 'deepseek/deepseek-chat';
				break;
			case 'groq':
				url = 'https://api.groq.com/openai/v1/chat/completions';
				targetModel = model || 'llama-3.3-70b-versatile';
				break;
			case 'custom':
				url = this.settings.customUrl;
				targetModel = model;
				break;
		}

		if (provider === 'custom' && !url) {
			return { success: false, message: 'Custom API URL not set' };
		}
		if (!targetModel || targetModel === '__custom__') {
			return { success: false, message: 'Please enter or select a valid Model ID' };
		}

		let requestBody;
		if (provider === 'claude') {
			requestBody = {
				model: targetModel,
				messages: [
					{ role: "user", content: "Test" }
				],
				max_tokens: 5
			};
		} else {
			requestBody = {
				model: targetModel,
				messages: [
					{ role: "user", content: "Test" }
				],
				max_tokens: 5
			};
		}

		const headers = {
			'Content-Type': 'application/json'
		};
		if (apiKey) {
			if (provider === 'claude') {
				headers['x-api-key'] = apiKey;
				headers['anthropic-version'] = '2023-06-01';
			} else {
				headers['Authorization'] = `Bearer ${apiKey}`;
			}
		}

		const requestParam = {
			url: url,
			method: 'POST',
			headers: headers,
			body: JSON.stringify(requestBody)
		};

		try {
			const response = await requestUrl(requestParam);
			if (response.status === 200) {
				return { success: true, message: "Connection successful!" };
			} else {
				return { success: false, message: `HTTP ${response.status}` };
			}
		} catch (error) {
			return { success: false, message: error.message };
		}
	}
}

class TranslatorPlugin extends Plugin {
	settings;
	translator;
	statusBarItem;

	async onload() {
		await this.loadSettings();
		this.translator = new Translator(this.settings);

		// Status Bar
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText('');

		// Add translation command
		this.addCommand({
			id: 'translate-insert-below',
			name: 'Translate Selection (Insert Below)',
			editorCallback: (editor, view) => {
				const selection = editor.getSelection();
				if (selection) {
					this.translateAndInsert(editor, selection);
				} else {
					new Notice('Please select text to translate first');
				}
			}
		});

		// Add Context Menu
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					item
						.setTitle("Translate Selection")
						.setIcon("languages")
						.onClick(async () => {
							const selection = editor.getSelection();
							if (selection) {
								this.translateAndInsert(editor, selection);
							} else {
								new Notice('Please select text to translate first');
							}
						});
				});
			})
		);

		// Add settings tab
		this.addSettingTab(new TranslatorSettingTab(this.app, this));
	}

	async translateAndInsert(editor, text) {
		new Notice('Translating...');
		this.statusBarItem.setText('Translating...');

		try {
			const translatedText = await this.translator.translate(text);
			if (translatedText) {
				const replacement = `${text}\n${translatedText}`;
				editor.replaceSelection(replacement);
				new Notice('Translation completed');
			} else {
				new Notice('Translation failed: empty response from model');
			}
		} catch (error) {
			console.error(error);
			new Notice(`Translation failed: ${error.message}`);
		} finally {
			this.statusBarItem.setText('');
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		if (this.translator) {
			this.translator.updateSettings(this.settings);
		}
	}
}

class TranslatorSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'AI Translation Settings' });

		// Pure English Provider Names
		new Setting(containerEl)
			.setName('AI Provider')
			.setDesc('Select translation service to use')
			.addDropdown(dropdown => dropdown
				.addOption('deepseek', 'DeepSeek')
				.addOption('qwen', 'Aliyun')
				.addOption('doubao', 'Doubao')
				.addOption('gemini', 'Google Gemini')
				.addOption('openai', 'OpenAI')
				.addOption('claude', 'Anthropic Claude')
				.addOption('siliconflow', 'SiliconFlow')
				.addOption('moonshot', 'Moonshot AI')
				.addOption('zhipu', 'Zhipu AI')
				.addOption('openrouter', 'OpenRouter')
				.addOption('groq', 'Groq')
				.addOption('custom', 'Custom API')
				.setValue(this.plugin.settings.provider)
				.onChange(async (value) => {
					this.plugin.settings.provider = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		// DeepSeek Settings
		if (this.plugin.settings.provider === 'deepseek') {
			this.addProviderSettings(containerEl, 'DeepSeek', 'deepseek');
		}

		// Aliyun Settings
		if (this.plugin.settings.provider === 'qwen') {
			this.addProviderSettings(containerEl, 'Aliyun', 'qwen');
		}

		// Doubao Settings
		if (this.plugin.settings.provider === 'doubao') {
			this.addProviderSettings(containerEl, 'Doubao', 'doubao');
		}

		// Gemini Settings
		if (this.plugin.settings.provider === 'gemini') {
			this.addProviderSettings(containerEl, 'Google Gemini', 'gemini');
		}

		// OpenAI Settings
		if (this.plugin.settings.provider === 'openai') {
			this.addProviderSettings(containerEl, 'OpenAI', 'openai');
		}

		// Claude Settings
		if (this.plugin.settings.provider === 'claude') {
			this.addProviderSettings(containerEl, 'Anthropic Claude', 'claude');
		}

		// SiliconFlow Settings
		if (this.plugin.settings.provider === 'siliconflow') {
			this.addProviderSettings(containerEl, 'SiliconFlow', 'siliconflow');
		}

		// Moonshot Settings
		if (this.plugin.settings.provider === 'moonshot') {
			this.addProviderSettings(containerEl, 'Moonshot AI', 'moonshot');
		}

		// Zhipu Settings
		if (this.plugin.settings.provider === 'zhipu') {
			this.addProviderSettings(containerEl, 'Zhipu AI', 'zhipu');
		}

		// OpenRouter Settings
		if (this.plugin.settings.provider === 'openrouter') {
			this.addProviderSettings(containerEl, 'OpenRouter', 'openrouter');
		}

		// Groq Settings
		if (this.plugin.settings.provider === 'groq') {
			this.addProviderSettings(containerEl, 'Groq', 'groq');
		}

		// Custom Settings
		if (this.plugin.settings.provider === 'custom') {
			this.addCustomProviderSettings(containerEl);
		}

		containerEl.createEl('h3', { text: 'Prompt Settings' });

		// Target Language Dropdown
		const standardLanguages = {
			'Chinese': 'Chinese (简体中文)',
			'Traditional Chinese': 'Traditional Chinese (繁體中文)',
			'English': 'English (英语)',
			'Japanese': '日本語 (Japanese / 日语)',
			'Korean': '한국어 (Korean / 韩语)',
			'German': 'Deutsch (German / 德语)',
			'French': 'Français (French / 法语)',
			'Spanish': 'Español (Spanish / 西班牙语)',
			'Russian': 'Русский (Russian / 俄语)',
			'Portuguese': 'Português (葡萄牙语)',
			'Italian': 'Italiano (意大利语)',
			'custom': 'Custom (自定义语言)...'
		};

		const currentTarget = (this.plugin.settings.targetLanguage || 'Chinese').trim();
		const isCustomLang = !Object.keys(standardLanguages).filter(k => k !== 'custom').includes(currentTarget);

		new Setting(containerEl)
			.setName('Target Language')
			.setDesc('Select the target language for translation')
			.addDropdown(dropdown => {
				for (const [code, label] of Object.entries(standardLanguages)) {
					dropdown.addOption(code, label);
				}
				dropdown.setValue(isCustomLang ? 'custom' : currentTarget);
				dropdown.onChange(async (value) => {
					if (value === 'custom') {
						if (!isCustomLang) {
							this.plugin.settings.targetLanguage = 'custom';
						}
					} else {
						this.plugin.settings.targetLanguage = value;
					}
					await this.plugin.saveSettings();
					this.display();
				});
			});

		if (isCustomLang) {
			new Setting(containerEl)
				.setName('Custom Target Language')
				.setDesc('Enter the custom target language name (e.g. Latin, Arabic)')
				.addText(text => text
					.setPlaceholder('e.g. Latin')
					.setValue(currentTarget === 'custom' ? '' : currentTarget)
					.onChange(async (value) => {
						this.plugin.settings.targetLanguage = value.trim() || 'custom';
						await this.plugin.saveSettings();
					}));
		}

		const effectiveLang = (currentTarget === 'custom' || !currentTarget) ? 'Chinese' : currentTarget;
		const defaultPrompt = `You are a professional translation assistant. Please directly translate the input text into ${effectiveLang}. Do not output any explanations, comments, or extra words, only output the translation result.`;

		const promptSetting = new Setting(containerEl)
			.setName('Custom System Prompt')
			.setDesc('Override the default system prompt. Leave empty to use default.');

		promptSetting.settingEl.addClass('translator-prompt-setting');
		promptSetting.addTextArea(text => {
			text.setPlaceholder(defaultPrompt)
				.setValue(this.plugin.settings.systemPrompt)
				.onChange(async (value) => {
					this.plugin.settings.systemPrompt = value;
					await this.plugin.saveSettings();
				});
			text.inputEl.rows = 6;
			text.inputEl.addClass('translator-prompt-textarea');
		});
	}

	addProviderSettings(containerEl, name, keyPrefix) {
		new Setting(containerEl)
			.setName(`${name} API Key`)
			.setDesc(`Enter your ${name} API Key`)
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings[`${keyPrefix}Key`])
				.onChange(async (value) => {
					this.plugin.settings[`${keyPrefix}Key`] = value.trim();
					await this.plugin.saveSettings();
				}))
			.addButton(button => button
				.setButtonText('Test Connection')
				.onClick(async () => {
					button.setButtonText('Testing...');
					const res = await this.plugin.translator.testConnection(
						keyPrefix,
						this.plugin.settings[`${keyPrefix}Key`],
						this.plugin.settings[`${keyPrefix}Model`]
					);
					if (res.success) {
						new Notice(`Success: ${res.message}`);
					} else {
						new Notice(`Failed: ${res.message}`);
					}
					button.setButtonText('Test Connection');
				}));

		if (keyPrefix === 'doubao') {
			new Setting(containerEl)
				.setName(`${name} Model (Endpoint ID)`)
				.setDesc('Enter your Doubao Endpoint ID from Volcengine console (e.g. ep-202406...)')
				.addText(text => text
					.setPlaceholder('ep-...')
					.setValue(this.plugin.settings[`${keyPrefix}Model`])
					.onChange(async (value) => {
						this.plugin.settings[`${keyPrefix}Model`] = value.trim();
						await this.plugin.saveSettings();
					}));
		} else {
			// At most 3 latest preset models per provider
			let presetModels = [];
			const modelOptions = [];

			switch (keyPrefix) {
				case 'deepseek':
					presetModels = ['deepseek-chat', 'deepseek-reasoner'];
					modelOptions.push(['deepseek-chat', 'DeepSeek-V3 (deepseek-chat) - Recommended']);
					modelOptions.push(['deepseek-reasoner', 'DeepSeek-R1 (deepseek-reasoner) - Reasoning']);
					break;
				case 'qwen':
					presetModels = ['qwen-plus', 'qwen-max', 'qwen-turbo'];
					modelOptions.push(['qwen-plus', 'Qwen-Plus (Recommended)']);
					modelOptions.push(['qwen-max', 'Qwen-Max (Best performance)']);
					modelOptions.push(['qwen-turbo', 'Qwen-Turbo (Fast & Cost-effective)']);
					break;
				case 'gemini':
					presetModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
					modelOptions.push(['gemini-2.5-flash', 'Gemini 2.5 Flash (Recommended)']);
					modelOptions.push(['gemini-2.5-pro', 'Gemini 2.5 Pro (Best reasoning)']);
					modelOptions.push(['gemini-2.0-flash', 'Gemini 2.0 Flash (Fast & Stable)']);
					break;
				case 'openai':
					presetModels = ['gpt-4o', 'gpt-4o-mini', 'o3-mini'];
					modelOptions.push(['gpt-4o', 'GPT-4o (Recommended)']);
					modelOptions.push(['gpt-4o-mini', 'GPT-4o-mini (Fast & Lightweight)']);
					modelOptions.push(['o3-mini', 'o3-mini (High reasoning)']);
					break;
				case 'claude':
					presetModels = ['claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'];
					modelOptions.push(['claude-3-7-sonnet-latest', 'Claude 3.7 Sonnet (Hybrid thinking)']);
					modelOptions.push(['claude-3-5-sonnet-latest', 'Claude 3.5 Sonnet (Industry standard)']);
					modelOptions.push(['claude-3-5-haiku-latest', 'Claude 3.5 Haiku (Fast & Lightweight)']);
					break;
				case 'siliconflow':
					presetModels = ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen2.5-72B-Instruct'];
					modelOptions.push(['deepseek-ai/DeepSeek-V3', 'DeepSeek-V3 (Mainstream)']);
					modelOptions.push(['deepseek-ai/DeepSeek-R1', 'DeepSeek-R1 (Full reasoning)']);
					modelOptions.push(['Qwen/Qwen2.5-72B-Instruct', 'Qwen 2.5 72B']);
					break;
				case 'moonshot':
					presetModels = ['moonshot-v1-auto', 'moonshot-v1-8k', 'moonshot-v1-32k'];
					modelOptions.push(['moonshot-v1-auto', 'Kimi Auto (Adaptive / Recommended)']);
					modelOptions.push(['moonshot-v1-8k', 'Kimi 8k (Short text)']);
					modelOptions.push(['moonshot-v1-32k', 'Kimi 32k (Long text)']);
					break;
				case 'zhipu':
					presetModels = ['glm-4-plus', 'glm-4-flash', 'glm-4-air'];
					modelOptions.push(['glm-4-plus', 'GLM-4 Plus (Flagship / Recommended)']);
					modelOptions.push(['glm-4-flash', 'GLM-4 Flash (Fast)']);
					modelOptions.push(['glm-4-air', 'GLM-4 Air (Cost-effective)']);
					break;
				case 'openrouter':
					presetModels = ['deepseek/deepseek-chat', 'anthropic/claude-3.7-sonnet', 'google/gemini-2.5-flash'];
					modelOptions.push(['deepseek/deepseek-chat', 'DeepSeek V3']);
					modelOptions.push(['anthropic/claude-3.7-sonnet', 'Claude 3.7 Sonnet']);
					modelOptions.push(['google/gemini-2.5-flash', 'Gemini 2.5 Flash']);
					break;
				case 'groq':
					presetModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
					modelOptions.push(['llama-3.3-70b-versatile', 'Llama 3.3 70B (Open-source main)']);
					modelOptions.push(['llama-3.1-8b-instant', 'Llama 3.1 8B (Sub-second response)']);
					modelOptions.push(['mixtral-8x7b-32768', 'Mixtral 8x7B (MoE)']);
					break;
				default:
					presetModels = [];
					break;
			}

			const currentModel = (this.plugin.settings[`${keyPrefix}Model`] || '').trim();
			const isCustom = !currentModel || currentModel === '__custom__' || !presetModels.includes(currentModel);

			new Setting(containerEl)
				.setName(`${name} Model`)
				.setDesc(`Select ${name} model`)
				.addDropdown(dropdown => {
					for (const [id, label] of modelOptions) {
						dropdown.addOption(id, label);
					}
					dropdown.addOption('__custom__', 'Custom Model...');

					dropdown
						.setValue(isCustom ? '__custom__' : currentModel)
						.onChange(async (value) => {
							if (value === '__custom__') {
								this.plugin.settings[`${keyPrefix}Model`] = '__custom__';
							} else {
								this.plugin.settings[`${keyPrefix}Model`] = value;
							}
							await this.plugin.saveSettings();
							this.display();
						});
				});

			if (isCustom) {
				new Setting(containerEl)
					.setName(`Custom ${name} Model ID`)
					.setDesc(`Enter custom model ID for ${name}`)
					.addText(text => text
						.setPlaceholder('e.g. gpt-4.5-preview / qwen-omni-turbo')
						.setValue(currentModel === '__custom__' ? '' : currentModel)
						.onChange(async (value) => {
							this.plugin.settings[`${keyPrefix}Model`] = value.trim() || '__custom__';
							await this.plugin.saveSettings();
						}));
			}
		}
	}

	addCustomProviderSettings(containerEl) {
		new Setting(containerEl)
			.setName('Custom API URL')
			.setDesc('Enter the complete chat completions API URL')
			.addText(text => text
				.setPlaceholder('https://api.openai.com/v1/chat/completions')
				.setValue(this.plugin.settings.customUrl)
				.onChange(async (value) => {
					this.plugin.settings.customUrl = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Custom API Key')
			.setDesc('Enter your API Key (leave empty if not required)')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.customKey)
				.onChange(async (value) => {
					this.plugin.settings.customKey = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Custom Model ID')
			.setDesc('Enter the model ID')
			.addText(text => text
				.setPlaceholder('e.g. gpt-4o')
				.setValue(this.plugin.settings.customModel)
				.onChange(async (value) => {
					this.plugin.settings.customModel = value.trim();
					await this.plugin.saveSettings();
				}))
			.addButton(button => button
				.setButtonText('Test Connection')
				.onClick(async () => {
					button.setButtonText('Testing...');
					const res = await this.plugin.translator.testConnection(
						'custom',
						this.plugin.settings.customKey,
						this.plugin.settings.customModel
					);
					if (res.success) {
						new Notice(`Success: ${res.message}`);
					} else {
						new Notice(`Failed: ${res.message}`);
					}
					button.setButtonText('Test Connection');
				}));
	}
}

module.exports = TranslatorPlugin;
