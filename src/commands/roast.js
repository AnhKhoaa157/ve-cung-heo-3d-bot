import { SlashCommandBuilder } from 'discord.js';

export const roastCommand = new SlashCommandBuilder()
  .setName('heo-roast')
  .setDescription('Random 1 trong 1.000 câu cà khịa vui về Héo 3D');

const openers = [
  'Héo 3D vừa mở Blender lên',
  'Mỗi lần Héo 3D bảo “xong rồi”',
  'Héo 3D gửi bản build lúc nửa đêm',
  'Khi Héo 3D sửa một lỗi nhỏ',
  'Héo 3D nhìn vào deadline',
  'Cứ nghe chữ “final_final” là biết',
  'Héo 3D vừa push code',
  'Khi file của Héo 3D loading',
  'Héo 3D mở họp nhóm',
  'Lúc Héo 3D nói “dễ mà”',
];

const middles = [
  'cả card đồ họa bắt đầu thở oxy',
  'deadline tự động lùi thêm một chút',
  'một bug mới được sinh ra ở đâu đó',
  'máy tính xin nghỉ giải lao',
  'Google Drive chuẩn bị đầy bộ nhớ',
  'cả nhóm đồng loạt bật chế độ im lặng',
  'file `final` lập tức có thêm 7 phiên bản',
  'một chiếc texture bị lạc vào không gian khác',
  'CI/CD bắt đầu thiền để giữ bình tĩnh',
  'một polygon vô tội bỗng biến mất',
];

const endings = [
  'và đó mới chỉ là bước đầu.',
  'nhưng tinh thần vẫn 3D hết cỡ.',
  'may mà chưa ai bấm nút deploy.',
  'cả server xin một phút mặc niệm.',
  'đúng là nghệ thuật của sự hỗn loạn.',
  'ít nhất lần này chưa cháy máy.',
  'vẫn tự tin gọi đó là tối ưu.',
  'và bản demo lại có thêm lore.',
  'nhưng ai cũng công nhận là có cố gắng.',
  'rồi tự nhiên mọi thứ chạy được, kỳ lạ thật.',
];

const roasts = openers.flatMap((opener) => middles.flatMap((middle) => endings.map((ending) => `${opener}, ${middle} — ${ending}`)));

export async function handleRoast(interaction) {
  const roast = roasts[Math.floor(Math.random() * roasts.length)];
  return interaction.reply(`🎲 **Héo 3D Roast #${Math.floor(Math.random() * 1000) + 1}/1000**\n${roast}`);
}
