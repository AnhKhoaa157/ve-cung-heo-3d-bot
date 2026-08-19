import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, SlashCommandBuilder } from 'discord.js';
import { isManager } from '../formatters.js';
import { getStore, persist } from '../storage.js';

const DEFAULT_ROLE_NAMES = [
  'Project Manager / BA',
  'Backend WP2',
  'AI Engineer WP3',
  'Frontend/Mobile WP4',
  'Montessori Guide',
  'QA / Research',
];

export const welcomeCommand = new SlashCommandBuilder()
  .setName('welcome')
  .setDescription('Thiết lập chào thành viên mới và tự chọn role')
  .addSubcommand((sub) => sub.setName('setup').setDescription('Gửi bảng tự chọn role')
    .addChannelOption((option) => option.setName('channel').setDescription('Kênh chào thành viên').addChannelTypes(ChannelType.GuildText)))
  .addSubcommand((sub) => sub.setName('status').setDescription('Xem cấu hình chào thành viên'));

function makeRoleRows(guild, roleIds) {
  const roles = roleIds.map((id) => guild.roles.cache.get(id)).filter(Boolean);
  const rows = [];
  for (let index = 0; index < roles.length; index += 5) {
    rows.push(new ActionRowBuilder().addComponents(...roles.slice(index, index + 5).map((role) => (
      new ButtonBuilder()
        .setCustomId(`selfrole:${role.id}`)
        .setLabel(role.name.slice(0, 80))
        .setStyle(ButtonStyle.Secondary)
    ))));
  }
  return rows;
}

function rolePickerPayload(guild, roleIds) {
  return {
    content: '👋 **Chọn nhóm của bạn**\nBấm vào role phù hợp để thêm hoặc bấm lại để gỡ. Bạn có thể chọn nhiều role.',
    components: makeRoleRows(guild, roleIds),
  };
}

export async function handleWelcome(interaction) {
  if (!isManager(interaction)) return interaction.reply({ content: 'Bạn cần quyền Manage Server để thiết lập welcome.', ephemeral: true });
  const subcommand = interaction.options.getSubcommand();
  const store = getStore();
  if (subcommand === 'status') {
    const current = store.meta.welcome;
    return interaction.reply({ content: current ? `Kênh chào: <#${current.channelId}>\nCó ${current.roleIds.length} role tự chọn.` : 'Chưa cấu hình. Dùng `/welcome setup`.', ephemeral: true });
  }
  await interaction.guild.roles.fetch();
  const roleIds = DEFAULT_ROLE_NAMES
    .map((name) => interaction.guild.roles.cache.find((role) => role.name === name)?.id)
    .filter(Boolean);
  if (!roleIds.length) return interaction.reply({ content: 'Không tìm thấy role nhóm đồ án. Hãy chạy `setup-server` để tạo role trước.', ephemeral: true });
  const channel = interaction.options.getChannel('channel') ?? interaction.channel;
  store.meta.welcome = { channelId: channel.id, roleIds, configuredAt: new Date().toISOString() };
  await persist();
  await channel.send(rolePickerPayload(interaction.guild, roleIds));
  return interaction.reply({ content: `Đã thiết lập welcome tại ${channel}.`, ephemeral: true });
}

export async function handleSelfRole(interaction) {
  const roleId = interaction.customId.slice('selfrole:'.length);
  const setup = getStore().meta.welcome;
  if (!setup?.roleIds.includes(roleId)) return interaction.reply({ content: 'Role này không còn trong cấu hình tự chọn.', ephemeral: true });
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) return interaction.reply({ content: 'Role này không còn tồn tại.', ephemeral: true });
  if (member.roles.cache.has(roleId)) {
    await member.roles.remove(role);
    return interaction.reply({ content: `Đã gỡ role **${role.name}**.`, ephemeral: true });
  }
  await member.roles.add(role);
  return interaction.reply({ content: `Đã thêm role **${role.name}**.`, ephemeral: true });
}

export async function handleMemberJoin(member) {
  const setup = getStore().meta.welcome;
  if (!setup) return;
  const channel = await member.guild.channels.fetch(setup.channelId).catch(() => null);
  if (!channel?.isTextBased()) return;
  await channel.send(`👋 Chào mừng ${member} đến với **${member.guild.name}**! Hãy xem nội quy và chọn role phù hợp trong bảng bên trên nhé.`);
}
