import 'dotenv/config';
import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import { commandDefinitions, handleButton, handleCommand, handleMemberJoin } from './src/commands/index.js';
import { startNotificationService } from './src/services/notifications.js';
import { config } from './src/config.js';
import { initializeStore } from './src/storage.js';

function validateConfig() {
  const missing = ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID'].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Thiếu cấu hình: ${missing.join(', ')}.`);
}

async function registerCommands(client) {
  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(
    Routes.applicationGuildCommands(client.user.id, config.guildId),
    { body: commandDefinitions },
  );
  console.log(`Đã đăng ký ${commandDefinitions.length} slash command cho server.`);
}

async function main() {
  validateConfig();
  await initializeStore();

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Bot đã sẵn sàng: ${readyClient.user.tag}`);
    await registerCommands(readyClient);
    startNotificationService(readyClient);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;
    try {
      if (interaction.isChatInputCommand()) await handleCommand(interaction);
      else await handleButton(interaction);
    } catch (error) {
      console.error(error);
      const payload = { content: 'Có lỗi khi xử lý lệnh. Hãy thử lại hoặc xem log của bot.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
      else await interaction.reply(payload);
    }
  });

  client.on(Events.GuildMemberAdd, (member) => {
    handleMemberJoin(member).catch((error) => console.error('Lỗi chào thành viên mới:', error));
  });

  await client.login(config.token);
}

main().catch((error) => {
  console.error(`Không thể khởi động bot: ${error.message}`);
  process.exitCode = 1;
});
