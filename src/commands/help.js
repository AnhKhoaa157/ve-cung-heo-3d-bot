import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export const helpCommand = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Xem hướng dẫn sử dụng bot');

export async function handleHelp(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('BOT HÉO 3D · Hướng dẫn nhanh')
    .addFields(
      { name: '📋 Công việc', value: '`/task create`, `list`, `status`, `remove`\n`/meeting schedule`, `list`, `cancel`' },
      { name: '🔔 Thông báo', value: '`/notify send`, `remind`, `list`, `cancel`\n`/daily` · điểm danh hằng ngày' },
      { name: '👥 Thành viên', value: '`/welcome setup` · tạo bảng tự chọn role\n`/welcome status` · xem cấu hình' },
      { name: '📊 Tiện ích', value: '`/poll create`, `results`, `close`\n`/translate` · dịch Việt–Anh\n`/resource add`, `list`, `find`, `remove`\n`/heo-roast` · cà khịa vui Héo 3D' },
    )
    .setFooter({ text: 'Các lệnh tạo/xóa/cấu hình cần quyền Manage Server.' });
  return interaction.reply({ embeds: [embed], ephemeral: true });
}
