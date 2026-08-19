export const config = {
  token: process.env.DISCORD_BOT_TOKEN,
  guildId: process.env.DISCORD_GUILD_ID,
  defaultNotificationChannelId: process.env.NOTIFICATION_CHANNEL_ID || null,
  dailyReportChannelId: process.env.DAILY_REPORT_CHANNEL_ID || null,
  dailyReportHour: Number.parseInt(process.env.DAILY_REPORT_HOUR || '9', 10),
  meetingReminderMinutes: Number.parseInt(process.env.MEETING_REMINDER_MINUTES || '15', 10),
  dailyTimeZone: process.env.DAILY_TIME_ZONE || 'Asia/Ho_Chi_Minh',
  deeplApiKey: process.env.DEEPL_API_KEY || null,
  deeplApiUrl: process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate',
};
