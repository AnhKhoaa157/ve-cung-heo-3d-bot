import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { createRecord, getStore, persist } from '../storage.js';
import { formatMeeting, parseDateTime } from '../formatters.js';

export const meetingCommand = new SlashCommandBuilder()
  .setName('meeting')
  .setDescription('Lên lịch và theo dõi cuộc họp')
  .addSubcommand((sub) => sub.setName('schedule').setDescription('Lên lịch họp')
    .addStringOption((option) => option.setName('title').setDescription('Tên cuộc họp').setRequired(true))
    .addStringOption((option) => option.setName('starts_at').setDescription('YYYY-MM-DD HH:mm').setRequired(true))
    .addIntegerOption((option) => option.setName('duration').setDescription('Số phút, mặc định 30'))
    .addChannelOption((option) => option.setName('channel').setDescription('Kênh gửi thông báo').addChannelTypes(ChannelType.GuildText)))
  .addSubcommand((sub) => sub.setName('list').setDescription('Xem các cuộc họp sắp tới'))
  .addSubcommand((sub) => sub.setName('cancel').setDescription('Hủy lịch họp')
    .addIntegerOption((option) => option.setName('id').setDescription('Mã cuộc họp').setRequired(true)));

export async function handleMeeting(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const store = getStore();
  if (subcommand === 'schedule') {
    const startsAt = parseDateTime(interaction.options.getString('starts_at', true));
    if (startsAt <= new Date()) throw new Error('Thời gian họp phải ở tương lai.');
    const meeting = await createRecord('meeting', {
      title: interaction.options.getString('title', true), startsAt: startsAt.toISOString(),
      durationMinutes: interaction.options.getInteger('duration') ?? 30,
      channelId: interaction.options.getChannel('channel')?.id ?? interaction.channelId,
      createdBy: interaction.user.id, createdAt: new Date().toISOString(), cancelled: false, reminderSentAt: null,
    });
    return interaction.reply(`Đã lên lịch họp.\n${formatMeeting(meeting)}`);
  }
  if (subcommand === 'list') {
    const meetings = store.meetings.filter((meeting) => !meeting.cancelled && new Date(meeting.startsAt) >= new Date());
    return interaction.reply({ content: meetings.length ? meetings.map(formatMeeting).join('\n\n').slice(0, 1900) : 'Không có cuộc họp sắp tới.', ephemeral: true });
  }
  const meeting = store.meetings.find((item) => item.id === interaction.options.getInteger('id', true));
  if (!meeting) return interaction.reply({ content: 'Không tìm thấy cuộc họp.', ephemeral: true });
  meeting.cancelled = true;
  await persist();
  return interaction.reply(`Đã hủy cuộc họp #${meeting.id}: ${meeting.title}.`);
}

