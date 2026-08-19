import 'dotenv/config';
import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleKeywordPresetType,
  AutoModerationRuleTriggerType,
  ChannelType,
  Client,
  GatewayIntentBits,
  PermissionsBitField,
} from 'discord.js';

const DRY_RUN = process.argv.includes('--dry-run');
const SERVER_NAME = 'Sketch2Life';
const REPLACE_STARTER_LAYOUT = process.env.REPLACE_STARTER_LAYOUT === 'true';

const BOT_LOG_CATEGORY_NAME = '🔒 NHẬT KÝ HỆ THỐNG';
const BOT_LOG_CHANNEL_NAME = 'bot-log';

// Discord's built-in KeywordPreset lists (Profanity/SexualContent/Slurs) are
// English-only and opaque, so they miss Vietnamese profanity. This explicit
// list fills that gap. Wildcards (*word*) match the term anywhere inside a
// word so basic spacing/leetspeak tricks (e.g. "đ.m", "vcl") still get caught.
// Extend this list as needed; each keyword must be <= 60 chars and the whole
// rule is capped at 1000 keywords by Discord.
//
// The list is read from VIETNAMESE_PROFANITY_KEYWORDS in .env (comma-separated)
// so it can be edited without touching code. Falls back to a built-in default
// if the env var is missing or empty.
const DEFAULT_VIETNAMESE_PROFANITY_KEYWORDS = [
  '*đm*', '*dm*', '*đ.m*', '*đjt*', '*djt*', '*đụ*', '*du*',
  '*vcl*', '*vkl*', '*clm*', '*cmm*', '*cmn*', '*đcm*', '*dcm*',
  '*lồn*', '*lon*', '*cặc*', '*cac*', '*buồi*', '*buoi*',
  '*địt*', '*dit*', '*đéo*', '*deo*', '*đĩ*', '*di*me*',
  '*thằng chó*', '*con chó*', '*chó chết*', '*đồ khốn*',
  '*ngu như*', '*óc chó*', '*óc lợn*', '*mất dạy*', '*vô học*',
];

function loadVietnameseProfanityKeywords() {
  const raw = process.env.VIETNAMESE_PROFANITY_KEYWORDS;
  if (!raw || !raw.trim()) return DEFAULT_VIETNAMESE_PROFANITY_KEYWORDS;
  return raw
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

const VIETNAMESE_PROFANITY_KEYWORDS = loadVietnameseProfanityKeywords();

// Change names here before running if you want a different layout.
const layout = [
  {
    name: '📌 ĐIỀU HÀNH',
    channels: [
      { name: 'rules', topic: 'Quy tắc làm việc, bảo mật và nguyên tắc xử lý dữ liệu trẻ em.', readOnly: true },
      { name: 'thông-báo', topic: 'Thông báo chính thức của dự án.', readOnly: true },
      { name: 'kế-hoạch-sprint', topic: 'Kế hoạch sprint, tiến độ và blocker.' },
      { name: 'họp-và-biên-bản', topic: 'Lịch họp, agenda và meeting notes.' },
      { name: 'tài-liệu-dự-án', topic: 'PRD, SRS, kiến trúc, link Figma và tài liệu dùng chung.' },
    ],
  },
  {
    name: '🧠 NGHIÊN CỨU & MONTESSORI',
    channels: [
      { name: 'montessori-curriculum', topic: 'Curriculum, vật liệu, age band và prerequisite graph.' },
      { name: 'child-safety-privacy', topic: 'Consent, retention/deletion, safety rules và screen-time limits.' },
      { name: 'research-evaluation', topic: 'Research questions, guide rating, household trial và metrics.' },
      { name: 'dataset-annotation', topic: 'Protocol gán nhãn tranh vẽ và child description.' },
    ],
  },
  {
    name: '💻 PHÁT TRIỂN',
    channels: [
      { name: 'frontend-mobile-wp4', topic: 'App phụ huynh/trẻ em, capture, narration, playback và guide console.' },
      { name: 'backend-recommender-wp2', topic: 'Profiles, consent, curriculum graph, recommender và retention.' },
      { name: 'ai-animation-wp3', topic: 'Multimodal understanding, uncertainty, animation và safety pipeline.' },
      { name: 'integration-qa', topic: 'API contracts, integration checks và release readiness.' },
      { name: 'bug-tracker', topic: 'Bug, reproduction steps, severity và owner.' },
    ],
  },
  {
    name: '🌱 THỬ NGHIỆM & DEMO',
    channels: [
      { name: 'test-cases', topic: 'Test cases: happy path, uncertainty, offline fallback và safety.' },
      { name: 'guide-feedback', topic: 'Feedback từ Montessori guide về mapping và recommendation.', slowmode: 10 },
      { name: 'parent-feedback', topic: 'Feedback household trial và off-screen completion.', slowmode: 10 },
      { name: 'demo-showcase', topic: 'Demo builds, screenshots và release notes.', slowmode: 10 },
    ],
  },
  {
    name: '🔊 LÀM VIỆC TRỰC TUYẾN',
    voiceChannels: ['Daily Standup', 'Pair Dev', 'Mentor Review'],
  },
];

const roles = [
  { name: 'Project Manager / BA' },
  { name: 'Backend WP2' },
  { name: 'AI Engineer WP3' },
  { name: 'Frontend/Mobile WP4' },
  { name: 'Montessori Guide' },
  { name: 'QA / Research' },
];

// AutoMod rules to protect a workspace that handles child-related data.
// SendAlertMessage posts a copy of the blocked message context into #bot-log.
function buildAutoModRules(alertChannelId) {
  return [
    {
      name: 'Chặn ngôn từ nhạy cảm (preset)',
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.KeywordPreset,
      triggerMetadata: {
        presets: [
          AutoModerationRuleKeywordPresetType.Profanity,
          AutoModerationRuleKeywordPresetType.SexualContent,
          AutoModerationRuleKeywordPresetType.Slurs,
        ],
      },
      actions: [
        {
          type: AutoModerationActionType.BlockMessage,
          metadata: { customMessage: 'Nội dung chứa từ ngữ không phù hợp với môi trường có dữ liệu trẻ em.' },
        },
        { type: AutoModerationActionType.SendAlertMessage, metadata: { channelId: alertChannelId } },
      ],
    },
    // Discord's presets above only cover English. This rule adds an explicit
    // Vietnamese keyword list (see VIETNAMESE_PROFANITY_KEYWORDS) since that's
    // what most messages in this server will actually be written in.
    {
      name: 'Chặn ngôn từ nhạy cảm (tiếng Việt)',
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.Keyword,
      triggerMetadata: { keywordFilter: VIETNAMESE_PROFANITY_KEYWORDS },
      actions: [
        {
          type: AutoModerationActionType.BlockMessage,
          metadata: { customMessage: 'Nội dung chứa từ ngữ không phù hợp với môi trường có dữ liệu trẻ em.' },
        },
        { type: AutoModerationActionType.SendAlertMessage, metadata: { channelId: alertChannelId } },
      ],
    },
    {
      name: 'Chặn link lạ',
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.Keyword,
      triggerMetadata: {
        regexPatterns: [
          'discord\\.gg/\\w+',
          '(bit\\.ly|tinyurl\\.com|t\\.co|is\\.gd|cutt\\.ly|shorturl\\.at)/\\S+',
        ],
      },
      actions: [
        {
          type: AutoModerationActionType.BlockMessage,
          metadata: { customMessage: 'Link ngoài chưa được duyệt đã bị chặn. Nhắn cho admin nếu cần chia sẻ liên kết.' },
        },
        { type: AutoModerationActionType.SendAlertMessage, metadata: { channelId: alertChannelId } },
      ],
    },
    {
      name: 'Chặn spam tin nhắn',
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.Spam,
      triggerMetadata: {},
      actions: [
        { type: AutoModerationActionType.BlockMessage },
        { type: AutoModerationActionType.SendAlertMessage, metadata: { channelId: alertChannelId } },
      ],
    },
    {
      name: 'Chặn spam mention',
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.MentionSpam,
      triggerMetadata: { mentionTotalLimit: 5, mentionRaidProtectionEnabled: true },
      actions: [
        { type: AutoModerationActionType.BlockMessage },
        { type: AutoModerationActionType.SendAlertMessage, metadata: { channelId: alertChannelId } },
      ],
    },
  ];
}

function printPlan() {
  console.log(`Kế hoạch cho server: ${SERVER_NAME}`);
  for (const category of layout) {
    console.log(`\n${category.name}`);
    for (const channel of category.channels ?? []) console.log(`  # ${channel.name}`);
    for (const channel of category.voiceChannels ?? []) console.log(`  🔊 ${channel}`);
  }
  console.log(`\n${BOT_LOG_CATEGORY_NAME}`);
  console.log(`  # ${BOT_LOG_CHANNEL_NAME} (ẩn, chỉ admin xem được)`);
  console.log(`\nRoles: ${roles.map((role) => role.name).join(', ')}`);
  console.log(
    '\nAutoMod rules: chặn ngôn từ nhạy cảm (preset + tiếng Việt), link lạ, spam tin nhắn và spam mention.',
  );
  console.log('\nDry run: chưa có thay đổi nào trên Discord.');
}

async function getOrCreateCategory(guild, name) {
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === name,
  );
  if (existing) return existing;
  return guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'Initial Vẽ Cùng Héo 3D setup' });
}

async function getOrCreateTextChannel(guild, category, spec) {
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.parentId === category.id &&
      channel.name === spec.name,
  );
  if (existing) return existing;

  // The fresh Discord server already contains #chung at the root. Reuse it
  // rather than making a duplicate, and only move that one known starter channel.
  if (spec.name === 'chung') {
    const starterChannel = guild.channels.cache.find(
      (channel) => channel.type === ChannelType.GuildText && channel.parentId === null && channel.name === 'chung',
    );
    if (starterChannel) {
      await starterChannel.setParent(category.id, { lockPermissions: false, reason: 'Organize starter #chung channel' });
      return starterChannel;
    }
  }

  const permissionOverwrites = spec.readOnly
    ? [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }]
    : [];
  return guild.channels.create({
    name: spec.name,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: spec.topic,
    permissionOverwrites,
    // Slowmode (seconds between messages per user) on channels that tend to
    // attract quick back-to-back posting, to keep discussion readable.
    rateLimitPerUser: spec.slowmode ?? 0,
    reason: 'Initial Vẽ Cùng Héo 3D setup',
  });
}

async function getOrCreateVoiceChannel(guild, category, name) {
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildVoice &&
      channel.parentId === category.id &&
      channel.name === name,
  );
  if (existing) return existing;
  return guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: category.id,
    reason: 'Initial Vẽ Cùng Héo 3D setup',
  });
}

// Hidden log channel: @everyone is denied View Channel, so only members whose
// role carries the Administrator permission (which bypasses overwrites) can
// see it. The bot's own user is explicitly allowed so it can always post logs.
async function getOrCreateBotLogChannel(guild, botUserId) {
  const category = await getOrCreateCategory(guild, BOT_LOG_CATEGORY_NAME);

  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.parentId === category.id &&
      channel.name === BOT_LOG_CHANNEL_NAME,
  );
  if (existing) return existing;

  return guild.channels.create({
    name: BOT_LOG_CHANNEL_NAME,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: 'Log tự động của setup-server.js. Chỉ admin (quyền Administrator) xem được.',
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      {
        id: botUserId,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      },
    ],
    reason: 'Initial Vẽ Cùng Héo 3D setup',
  });
}

// Discord messages are capped at 2000 characters, so split the accumulated
// log lines into chunks before sending them to #bot-log.
async function flushBotLog(botLogChannel, lines) {
  if (!botLogChannel || lines.length === 0) return;
  const text = lines.join('\n');
  const chunks = [];
  for (let i = 0; i < text.length; i += 1900) chunks.push(text.slice(i, i + 1900));
  for (const chunk of chunks) {
    await botLogChannel.send({ content: `\`\`\`\n${chunk}\n\`\`\`` });
  }
}

async function ensureAutoModRules(guild, alertChannelId, log) {
  let existingRules = [];
  try {
    existingRules = await guild.autoModerationRules.fetch();
  } catch (error) {
    log(`Không đọc được AutoMod rules hiện có: ${error.message}`);
    return;
  }

  for (const rule of buildAutoModRules(alertChannelId)) {
    if (existingRules.some((current) => current.name === rule.name)) {
      log(`Đã có AutoMod rule: ${rule.name}`);
      continue;
    }
    try {
      await guild.autoModerationRules.create({ ...rule, reason: 'Initial Vẽ Cùng Héo 3D setup' });
      log(`Đã tạo AutoMod rule: ${rule.name}`);
    } catch (error) {
      log(`Không tạo được AutoMod rule "${rule.name}": ${error.message}`);
    }
  }
}

async function removeStarterLayout(guild, log) {
  const starterCategories = new Set([
    'Kênh Chat', 'Kênh đàm thoại', '📜 QUY ĐỊNH', '📢 CẬP NHẬT', '🎨 CỘNG ĐỒNG 3D', '🔊 PHÒNG THOẠI',
  ]);
  const categories = guild.channels.cache.filter(
    (channel) => channel.type === ChannelType.GuildCategory && starterCategories.has(channel.name),
  );
  for (const category of categories.values()) {
    const children = guild.channels.cache.filter((channel) => channel.parentId === category.id);
    for (const child of children.values()) await child.delete('Replace generic starter layout with Sketch2Life workspace');
    await category.delete('Replace generic starter layout with Sketch2Life workspace');
  }
  log('Đã gỡ layout mẫu cũ.');
}

async function main() {
  if (DRY_RUN) return printPlan();

  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !guildId) {
    throw new Error('Thiếu DISCORD_BOT_TOKEN hoặc DISCORD_GUILD_ID. Hãy tạo file .env từ .env.example.');
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(token);
  const guild = await client.guilds.fetch(guildId);
  await guild.channels.fetch();
  await guild.roles.fetch();

  const logLines = [`Setup chạy lúc ${new Date().toISOString()}`];
  const log = (line) => {
    console.log(line);
    logLines.push(line);
  };
  let botLogChannel;

  try {
    log(`Đã kết nối: ${guild.name}`);

    // Create the hidden log channel first so its ID is ready for the
    // AutoMod alert action set up later.
    botLogChannel = await getOrCreateBotLogChannel(guild, client.user.id);
    log(`Sẵn sàng log channel: #${botLogChannel.name} (ẩn với mọi role trừ admin)`);

    if (REPLACE_STARTER_LAYOUT) {
      await removeStarterLayout(guild, log);
      await guild.channels.fetch();
    }

    for (const role of roles) {
      if (!guild.roles.cache.some((current) => current.name === role.name)) {
        await guild.roles.create({ ...role, reason: 'Initial Vẽ Cùng Héo 3D setup' });
        log(`Đã tạo role: ${role.name}`);
      } else log(`Đã có role: ${role.name}`);
    }

    for (const group of layout) {
      const category = await getOrCreateCategory(guild, group.name);
      log(`Sẵn sàng category: ${category.name}`);
      for (const channel of group.channels ?? []) {
        await getOrCreateTextChannel(guild, category, channel);
        log(`  # ${channel.name}`);
      }
      for (const channel of group.voiceChannels ?? []) {
        await getOrCreateVoiceChannel(guild, category, channel);
        log(`  🔊 ${channel}`);
      }
    }

    await ensureAutoModRules(guild, botLogChannel.id, log);

    log('\nXong. Script không xóa hoặc đổi tên bất kỳ kênh/role có sẵn nào.');
    await flushBotLog(botLogChannel, logLines);
    client.destroy();
  } catch (error) {
    log(`Lỗi: ${error.message}`);
    await flushBotLog(botLogChannel, logLines).catch(() => {});
    client.destroy();
    throw error;
  }
}

main().catch((error) => {
  console.error(`\nLỗi: ${error.message}`);
  process.exitCode = 1;
});