import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { createRecord, getStore, persist } from '../storage.js';
import { isManager, parseDateTime } from '../formatters.js';

export const notifyCommand = new SlashCommandBuilder()
  .setName('notify')
  .setDescription('Gửi và hẹn thông báo')
  .addSubcommand((sub) => sub.setName('send').setDescription('Gửi thông báo ngay')
    .addStringOption((option) => option.setName('message').setDescription('Nội dung').setRequired(true))
    .addChannelOption((option) => option.setName('channel').setDescription('Kênh nhận thông báo').addChannelTypes(ChannelType.GuildText)))
  .addSubcommand((sub) => sub.setName('remind').setDescription('Hẹn thông báo')
    .addStringOption((option) => option.setName('message').setDescription('Nội dung').setRequired(true))
    .addStringOption((option) => option.setName('at').setDescription('YYYY-MM-DD HH:mm').setRequired(true))
    .addChannelOption((option) => option.setName('channel').setDescription('Kênh nhận thông báo').addChannelTypes(ChannelType.GuildText)))
  .addSubcommand((sub) => sub.setName('list').setDescription('Xem thông báo đang hẹn'))
  .addSubcommand((sub) => sub.setName('cancel').setDescription('Hủy thông báo đã hẹn')
    .addIntegerOption((option) => option.setName('id').setDescription('Mã thông báo').setRequired(true)));

export async function handleNotify(interaction) {
  if (!isManager(interaction)) return interaction.reply({ content: 'Bạn cần quyền Manage Server để dùng lệnh thông báo.', ephemeral: true });
  const subcommand = interaction.options.getSubcommand();
  const store = getStore();
  if (subcommand === 'send') {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    await channel.send(`📢 **Thông báo**\n${interaction.options.getString('message', true)}`);
    return interaction.reply({ content: `Đã gửi vào ${channel}.`, ephemeral: true });
  }
  if (subcommand === 'remind') {
    const at = parseDateTime(interaction.options.getString('at', true));
    if (at <= new Date()) throw new Error('Thời gian nhắc phải ở tương lai.');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const reminder = await createRecord('reminder', { message: interaction.options.getString('message', true), channelId: channel.id, at: at.toISOString(), createdBy: interaction.user.id, sentAt: null, cancelled: false });
    return interaction.reply({ content: `Đã hẹn thông báo #${reminder.id} vào <t:${Math.floor(at.getTime() / 1000)}:F>.`, ephemeral: true });
  }
  if (subcommand === 'list') {
    const reminders = store.reminders.filter((item) => !item.sentAt && !item.cancelled);
    const content = reminders.length ? reminders.map((item) => `#${item.id} — <t:${Math.floor(new Date(item.at).getTime() / 1000)}:F> — ${item.message}`).join('\n').slice(0, 1900) : 'Không có thông báo đang hẹn.';
    return interaction.reply({ content, ephemeral: true });
  }
  const reminder = store.reminders.find((item) => item.id === interaction.options.getInteger('id', true));
  if (!reminder) return interaction.reply({ content: 'Không tìm thấy thông báo.', ephemeral: true });
  reminder.cancelled = true;
  await persist();
  return interaction.reply({ content: `Đã hủy thông báo #${reminder.id}.`, ephemeral: true });
}

