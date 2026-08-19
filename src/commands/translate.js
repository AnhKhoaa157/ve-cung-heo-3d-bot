import { SlashCommandBuilder } from 'discord.js';
import { config } from '../config.js';

export const translateCommand = new SlashCommandBuilder()
  .setName('translate')
  .setDescription('Dịch nhanh Việt–Anh hoặc Anh–Việt')
  .addStringOption((option) => option.setName('text').setDescription('Văn bản cần dịch').setRequired(true).setMaxLength(4500))
  .addStringOption((option) => option.setName('to').setDescription('Ngôn ngữ đích').setRequired(true)
    .addChoices({ name: 'Tiếng Việt', value: 'VI' }, { name: 'English', value: 'EN' }));

export async function handleTranslate(interaction) {
  if (!config.deeplApiKey) {
    return interaction.reply({ content: 'Chưa cấu hình dịch. Admin hãy thêm `DEEPL_API_KEY` vào `.env` rồi khởi động lại bot.', ephemeral: true });
  }
  await interaction.deferReply();
  const body = new URLSearchParams({ text: interaction.options.getString('text', true), target_lang: interaction.options.getString('to', true) });
  const response = await fetch(config.deeplApiUrl, {
    method: 'POST', headers: { Authorization: `DeepL-Auth-Key ${config.deeplApiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!response.ok) throw new Error(`Dịch thất bại (DeepL ${response.status}). Kiểm tra DEEPL_API_KEY.`);
  const data = await response.json();
  const translated = data.translations?.[0];
  if (!translated?.text) throw new Error('Dịch vụ không trả về nội dung hợp lệ.');
  await interaction.editReply(`🌐 **${translated.detected_source_language} → ${interaction.options.getString('to', true)}**\n${translated.text}`);
}
