import { EmbedBuilder, SlashCommandBuilder, escapeMarkdown } from 'discord.js';
import { isManager } from '../formatters.js';
import { createRecord, getStore, persist } from '../storage.js';

const categories = [
  { name: 'Tài liệu', value: 'docs' },
  { name: 'Thiết kế / Figma', value: 'design' },
  { name: 'Mã nguồn', value: 'code' },
  { name: 'Asset 3D', value: '3d' },
  { name: 'Khác', value: 'other' },
];
const categoryLabel = Object.fromEntries(categories.map((category) => [category.value, category.name]));

export const resourceCommand = new SlashCommandBuilder()
  .setName('resource')
  .setDescription('Lưu và tìm tài nguyên của nhóm')
  .addSubcommand((sub) => sub.setName('add').setDescription('Thêm tài nguyên')
    .addStringOption((option) => option.setName('name').setDescription('Tên tài nguyên').setRequired(true).setMaxLength(100))
    .addStringOption((option) => option.setName('url').setDescription('Link https://...').setRequired(true).setMaxLength(500))
    .addStringOption((option) => option.setName('category').setDescription('Loại tài nguyên').setRequired(true).addChoices(...categories))
    .addStringOption((option) => option.setName('description').setDescription('Mô tả ngắn').setMaxLength(500)))
  .addSubcommand((sub) => sub.setName('list').setDescription('Xem tài nguyên')
    .addStringOption((option) => option.setName('category').setDescription('Lọc theo loại').addChoices(...categories)))
  .addSubcommand((sub) => sub.setName('find').setDescription('Tìm tài nguyên theo tên hoặc mô tả')
    .addStringOption((option) => option.setName('query').setDescription('Từ khóa').setRequired(true).setMaxLength(100)))
  .addSubcommand((sub) => sub.setName('remove').setDescription('Xóa tài nguyên')
    .addIntegerOption((option) => option.setName('id').setDescription('Mã tài nguyên').setRequired(true)));

function formatResource(resource) {
  const description = resource.description ? ` — ${resource.description}` : '';
  return `**#${resource.id} · ${resource.name}** [${categoryLabel[resource.category]}]\n${resource.url}${description}`;
}

function listReply(resources, emptyText, title) {
  if (!resources.length) return { content: emptyText, ephemeral: true };
  const rows = [];
  let length = 0;
  for (const resource of resources) {
    const row = `\`${resource.id}\`  |  ${categoryLabel[resource.category]}  |  [${escapeMarkdown(resource.name)}](${resource.url})`;
    if (length + row.length > 3800) break;
    rows.push(row);
    length += row.length + 1;
  }
  const footer = rows.length < resources.length ? `Hiển thị ${rows.length}/${resources.length} tài nguyên.` : `${resources.length} tài nguyên.`;
  return {
    embeds: [new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(title)
      .setDescription(`**ID**  |  **Loại**  |  **Tài nguyên**\n${rows.join('\n')}`)
      .setFooter({ text: footer })],
    ephemeral: true,
  };
}

export async function handleResource(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const store = getStore();
  if (subcommand === 'add') {
    if (!isManager(interaction)) return interaction.reply({ content: 'Bạn cần quyền Manage Server để thêm tài nguyên.', ephemeral: true });
    const url = interaction.options.getString('url', true);
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
    } catch {
      return interaction.reply({ content: 'Link phải bắt đầu bằng `http://` hoặc `https://`.', ephemeral: true });
    }
    const resource = await createRecord('resource', {
      name: interaction.options.getString('name', true), url,
      category: interaction.options.getString('category', true),
      description: interaction.options.getString('description') ?? null,
      createdBy: interaction.user.id, createdAt: new Date().toISOString(),
    });
    return interaction.reply({ content: `Đã lưu tài nguyên.\n${formatResource(resource)}` });
  }
  if (subcommand === 'list') {
    const category = interaction.options.getString('category');
    return interaction.reply(listReply(store.resources.filter((resource) => !category || resource.category === category), 'Chưa có tài nguyên phù hợp.', '📚 Thư viện tài nguyên'));
  }
  if (subcommand === 'find') {
    const query = interaction.options.getString('query', true).toLocaleLowerCase();
    const matches = store.resources.filter((resource) => `${resource.name} ${resource.description ?? ''}`.toLocaleLowerCase().includes(query));
    return interaction.reply(listReply(matches, 'Không tìm thấy tài nguyên phù hợp.', `🔎 Kết quả: ${interaction.options.getString('query', true)}`));
  }
  if (!isManager(interaction)) return interaction.reply({ content: 'Bạn cần quyền Manage Server để xóa tài nguyên.', ephemeral: true });
  const id = interaction.options.getInteger('id', true);
  const index = store.resources.findIndex((resource) => resource.id === id);
  if (index === -1) return interaction.reply({ content: `Không tìm thấy tài nguyên #${id}.`, ephemeral: true });
  const [removed] = store.resources.splice(index, 1);
  await persist();
  return interaction.reply({ content: `Đã xóa tài nguyên **${removed.name}**.`, ephemeral: true });
}
