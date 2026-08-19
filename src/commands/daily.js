import { SlashCommandBuilder } from 'discord.js';
import { config } from '../config.js';
import { getStore, persist } from '../storage.js';

export const dailyCommand = new SlashCommandBuilder()
  .setName('daily')
  .setDescription('Điểm danh hôm nay và xem chuỗi ngày liên tiếp');

function dateKey(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.dailyTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const date = new Date(Date.UTC(values.year, Number(values.month) - 1, Number(values.day) + offsetDays));
  return date.toISOString().slice(0, 10);
}

export async function handleDaily(interaction) {
  const store = getStore();
  const today = dateKey();
  const previous = store.dailyClaims.find((claim) => claim.userId === interaction.user.id && claim.date === today);
  if (previous) {
    return interaction.reply({ content: `Bạn đã điểm danh hôm nay rồi. Chuỗi hiện tại: **${previous.streak} ngày** 🔥`, ephemeral: true });
  }
  const yesterday = dateKey(-1);
  const latest = store.dailyClaims
    .filter((claim) => claim.userId === interaction.user.id)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const streak = latest?.date === yesterday ? latest.streak + 1 : 1;
  store.dailyClaims.push({ userId: interaction.user.id, date: today, streak, claimedAt: new Date().toISOString() });
  await persist();
  return interaction.reply(`✅ ${interaction.user} đã điểm danh ngày **${today}**. Chuỗi: **${streak} ngày** ${streak >= 7 ? '🔥' : '✨'}`);
}
