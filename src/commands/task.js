import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { createRecord, getStore, persist } from '../storage.js';
import { formatTask, parseDateTime, taskStatuses } from '../formatters.js';

export const taskCommand = new SlashCommandBuilder()
  .setName('task')
  .setDescription('Quản lý công việc của dự án')
  .addSubcommand((sub) => sub.setName('create').setDescription('Tạo công việc')
    .addStringOption((option) => option.setName('title').setDescription('Tên công việc').setRequired(true))
    .addStringOption((option) => option.setName('deadline').setDescription('YYYY-MM-DD HH:mm'))
    .addUserOption((option) => option.setName('assignee').setDescription('Người phụ trách'))
    .addChannelOption((option) => option.setName('channel').setDescription('Kênh nhận nhắc việc').addChannelTypes(ChannelType.GuildText)))
  .addSubcommand((sub) => sub.setName('list').setDescription('Xem danh sách công việc')
    .addStringOption((option) => option.setName('status').setDescription('Lọc theo trạng thái').addChoices(...taskStatuses.map((value) => ({ name: value, value })))) )
  .addSubcommand((sub) => sub.setName('status').setDescription('Đổi trạng thái công việc')
    .addIntegerOption((option) => option.setName('id').setDescription('Mã task').setRequired(true))
    .addStringOption((option) => option.setName('value').setDescription('Trạng thái mới').setRequired(true).addChoices(...taskStatuses.map((value) => ({ name: value, value })))))
  .addSubcommand((sub) => sub.setName('remove').setDescription('Xóa công việc')
    .addIntegerOption((option) => option.setName('id').setDescription('Mã task').setRequired(true)));

export async function handleTask(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const store = getStore();
  if (subcommand === 'create') {
    const deadlineValue = interaction.options.getString('deadline');
    const deadline = deadlineValue ? parseDateTime(deadlineValue).toISOString() : null;
    const task = await createRecord('task', {
      title: interaction.options.getString('title', true), status: 'todo', deadline,
      assigneeId: interaction.options.getUser('assignee')?.id ?? null,
      channelId: interaction.options.getChannel('channel')?.id ?? interaction.channelId,
      createdBy: interaction.user.id, createdAt: new Date().toISOString(), deadlineNotifiedAt: null,
    });
    return interaction.reply({ content: `Đã tạo task.\n${formatTask(task)}` });
  }
  if (subcommand === 'list') {
    const status = interaction.options.getString('status');
    const tasks = store.tasks.filter((task) => !status || task.status === status);
    return interaction.reply({ content: tasks.length ? tasks.map(formatTask).join('\n\n').slice(0, 1900) : 'Chưa có task phù hợp.', ephemeral: true });
  }
  const id = interaction.options.getInteger('id', true);
  const index = store.tasks.findIndex((task) => task.id === id);
  if (index === -1) return interaction.reply({ content: `Không tìm thấy task #${id}.`, ephemeral: true });
  if (subcommand === 'status') {
    store.tasks[index].status = interaction.options.getString('value', true);
    store.tasks[index].updatedAt = new Date().toISOString();
    await persist();
    return interaction.reply(`Đã cập nhật task.\n${formatTask(store.tasks[index])}`);
  }
  store.tasks.splice(index, 1);
  await persist();
  return interaction.reply(`Đã xóa task #${id}.`);
}

