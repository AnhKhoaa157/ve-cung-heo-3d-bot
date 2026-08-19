export const taskStatuses = ['todo', 'doing', 'review', 'done'];

export function formatTask(task) {
  const owner = task.assigneeId ? `<@${task.assigneeId}>` : 'Chưa giao';
  const deadline = task.deadline ? `<t:${Math.floor(new Date(task.deadline).getTime() / 1000)}:d>` : 'Không có';
  return `**#${task.id} — ${task.title}**\nTrạng thái: \`${task.status}\` · Phụ trách: ${owner} · Hạn: ${deadline}`;
}

export function formatMeeting(meeting) {
  const time = Math.floor(new Date(meeting.startsAt).getTime() / 1000);
  return `**#${meeting.id} — ${meeting.title}**\nBắt đầu: <t:${time}:F> · <t:${time}:R> · Thời lượng: ${meeting.durationMinutes} phút`;
}

export function parseDateTime(value) {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) throw new Error('Thời gian không hợp lệ. Dùng dạng YYYY-MM-DD HH:mm, ví dụ 2026-08-20 14:30.');
  return date;
}

export function isManager(interaction) {
  return interaction.memberPermissions?.has('ManageGuild') || interaction.memberPermissions?.has('Administrator');
}
