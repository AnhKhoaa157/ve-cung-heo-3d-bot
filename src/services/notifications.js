import { config } from '../config.js';
import { getStore, persist } from '../storage.js';
import { pollPayload } from '../commands/poll.js';

async function getTextChannel(client, channelId) {
  if (!channelId) return null;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  return channel?.isTextBased() ? channel : null;
}

async function runNotifications(client) {
  const store = getStore();
  const now = new Date();
  let changed = false;
  for (const reminder of store.reminders.filter((item) => !item.cancelled && !item.sentAt && new Date(item.at) <= now)) {
    const channel = await getTextChannel(client, reminder.channelId);
    if (channel) await channel.send(`⏰ **Nhắc việc**\n${reminder.message}`);
    reminder.sentAt = now.toISOString(); changed = true;
  }
  const reminderLead = config.meetingReminderMinutes * 60_000;
  for (const meeting of store.meetings.filter((item) => !item.cancelled && !item.reminderSentAt)) {
    const msUntilMeeting = new Date(meeting.startsAt).getTime() - now.getTime();
    if (msUntilMeeting < 0 || msUntilMeeting > reminderLead) continue;
    const channel = await getTextChannel(client, meeting.channelId);
    if (channel) await channel.send(`🔔 **Sắp họp sau ${config.meetingReminderMinutes} phút:** ${meeting.title}\n<t:${Math.floor(new Date(meeting.startsAt).getTime() / 1000)}:F>`);
    meeting.reminderSentAt = now.toISOString(); changed = true;
  }
  for (const task of store.tasks.filter((item) => item.status !== 'done' && item.deadline && !item.deadlineNotifiedAt)) {
    const msUntilDeadline = new Date(task.deadline).getTime() - now.getTime();
    if (msUntilDeadline < 0 || msUntilDeadline > 24 * 60 * 60 * 1000) continue;
    const channel = await getTextChannel(client, task.channelId || config.defaultNotificationChannelId);
    if (channel) await channel.send(`⏳ **Task sắp đến hạn:** #${task.id} — ${task.title}${task.assigneeId ? ` · <@${task.assigneeId}>` : ''}\nHạn: <t:${Math.floor(new Date(task.deadline).getTime() / 1000)}:R>`);
    task.deadlineNotifiedAt = now.toISOString(); changed = true;
  }
  for (const poll of store.polls.filter((item) => !item.closed && new Date(item.closesAt) <= now)) {
    poll.closed = true;
    const channel = await getTextChannel(client, poll.channelId);
    const message = channel ? await channel.messages.fetch(poll.messageId).catch(() => null) : null;
    if (message) await message.edit(pollPayload(poll, true));
    changed = true;
  }
  const hour = now.getHours();
  const dayKey = now.toISOString().slice(0, 10);
  if (config.dailyReportChannelId && hour === config.dailyReportHour && store.meta.lastDailyReportKey !== dayKey) {
    const channel = await getTextChannel(client, config.dailyReportChannelId);
    if (channel) {
      const open = store.tasks.filter((task) => task.status !== 'done');
      const byStatus = ['todo', 'doing', 'review'].map((status) => `${status}: ${open.filter((task) => task.status === status).length}`).join(' · ');
      await channel.send(`📊 **Báo cáo tiến độ ngày ${dayKey}**\nTask đang mở: ${open.length} (${byStatus})`);
      store.meta.lastDailyReportKey = dayKey; changed = true;
    }
  }
  if (changed) await persist();
}

export function startNotificationService(client) {
  const tick = () => runNotifications(client).catch((error) => console.error('Lỗi dịch vụ thông báo:', error));
  tick();
  setInterval(tick, 60_000);
  console.log('Dịch vụ thông báo đã khởi động.');
}
