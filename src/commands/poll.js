import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { createRecord, getStore, persist } from '../storage.js';
import { isManager } from '../formatters.js';

export const pollCommand = new SlashCommandBuilder()
  .setName('poll')
  .setDescription('Tạo và quản lý bình chọn')
  .addSubcommand((sub) => sub.setName('create').setDescription('Tạo poll bằng nút bấm')
    .addStringOption((option) => option.setName('question').setDescription('Câu hỏi').setRequired(true))
    .addStringOption((option) => option.setName('options').setDescription('Các lựa chọn, cách nhau bằng dấu chấm phẩy (;), từ 2–5 lựa chọn').setRequired(true))
    .addIntegerOption((option) => option.setName('duration').setDescription('Số phút mở poll, mặc định 60').setMinValue(1).setMaxValue(10080)))
  .addSubcommand((sub) => sub.setName('results').setDescription('Xem kết quả poll')
    .addIntegerOption((option) => option.setName('id').setDescription('Mã poll').setRequired(true)))
  .addSubcommand((sub) => sub.setName('close').setDescription('Đóng poll sớm')
    .addIntegerOption((option) => option.setName('id').setDescription('Mã poll').setRequired(true)));

function resultLines(poll) {
  const counts = poll.options.map((_, index) => Object.values(poll.votes).filter((vote) => vote === index).length);
  return poll.options.map((option, index) => `${index + 1}. **${option}** — ${counts[index]} phiếu`).join('\n');
}

export function pollPayload(poll, disabled = false) {
  const closesAt = Math.floor(new Date(poll.closesAt).getTime() / 1000);
  const rows = [];
  for (let index = 0; index < poll.options.length; index += 5) {
    rows.push(new ActionRowBuilder().addComponents(
      ...poll.options.slice(index, index + 5).map((option, localIndex) => {
        const optionIndex = index + localIndex;
        return new ButtonBuilder().setCustomId(`poll:${poll.id}:${optionIndex}`).setLabel(`${optionIndex + 1}. ${option}`.slice(0, 80)).setStyle(ButtonStyle.Primary).setDisabled(disabled);
      }),
    ));
  }
  return { content: `📊 **Poll #${poll.id}: ${poll.question}**\nĐóng: <t:${closesAt}:R>\n\n${resultLines(poll)}`, components: rows };
}

export async function handlePoll(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const store = getStore();
  if (subcommand === 'create') {
    if (!isManager(interaction)) return interaction.reply({ content: 'Bạn cần quyền Manage Server để tạo poll.', ephemeral: true });
    const options = interaction.options.getString('options', true).split(';').map((item) => item.trim()).filter(Boolean);
    if (options.length < 2 || options.length > 5) return interaction.reply({ content: 'Poll cần từ 2 đến 5 lựa chọn, ngăn cách bằng dấu `;`.', ephemeral: true });
    if (new Set(options.map((item) => item.toLocaleLowerCase())).size !== options.length) return interaction.reply({ content: 'Các lựa chọn không được trùng nhau.', ephemeral: true });
    const duration = interaction.options.getInteger('duration') ?? 60;
    const poll = await createRecord('poll', { question: interaction.options.getString('question', true), options, votes: {}, channelId: interaction.channelId, messageId: null, createdBy: interaction.user.id, closesAt: new Date(Date.now() + duration * 60_000).toISOString(), closed: false });
    const reply = await interaction.reply({ ...pollPayload(poll), fetchReply: true });
    poll.messageId = reply.id;
    await persist();
    return;
  }
  const poll = store.polls.find((item) => item.id === interaction.options.getInteger('id', true));
  if (!poll) return interaction.reply({ content: 'Không tìm thấy poll.', ephemeral: true });
  if (subcommand === 'results') return interaction.reply({ content: `📊 **Kết quả poll #${poll.id}: ${poll.question}**\n${resultLines(poll)}`, ephemeral: true });
  if (!isManager(interaction)) return interaction.reply({ content: 'Bạn cần quyền Manage Server để đóng poll.', ephemeral: true });
  poll.closed = true;
  await persist();
  const channel = await interaction.client.channels.fetch(poll.channelId).catch(() => null);
  const message = channel?.isTextBased() ? await channel.messages.fetch(poll.messageId).catch(() => null) : null;
  if (message) await message.edit(pollPayload(poll, true));
  return interaction.reply({ content: `Đã đóng poll #${poll.id}.`, ephemeral: true });
}

export async function handlePollVote(interaction) {
  const [, pollId, optionIndex] = interaction.customId.split(':');
  const poll = getStore().polls.find((item) => item.id === Number(pollId));
  if (!poll || poll.closed || new Date(poll.closesAt) <= new Date()) return interaction.reply({ content: 'Poll này đã đóng.', ephemeral: true });
  poll.votes[interaction.user.id] = Number(optionIndex);
  await persist();
  await interaction.update(pollPayload(poll));
}
