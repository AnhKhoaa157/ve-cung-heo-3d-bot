import { taskCommand, handleTask } from './task.js';
import { meetingCommand, handleMeeting } from './meeting.js';
import { notifyCommand, handleNotify } from './notify.js';
import { dailyCommand, handleDaily } from './daily.js';
import { translateCommand, handleTranslate } from './translate.js';
import { pollCommand, handlePoll, handlePollVote } from './poll.js';
import { welcomeCommand, handleMemberJoin, handleSelfRole, handleWelcome } from './welcome.js';
import { resourceCommand, handleResource } from './resource.js';
import { helpCommand, handleHelp } from './help.js';

export const commandDefinitions = [taskCommand, meetingCommand, notifyCommand, dailyCommand, translateCommand, pollCommand, welcomeCommand, resourceCommand, helpCommand].map((command) => command.toJSON());

export async function handleCommand(interaction) {
  if (interaction.commandName === 'task') return handleTask(interaction);
  if (interaction.commandName === 'meeting') return handleMeeting(interaction);
  if (interaction.commandName === 'notify') return handleNotify(interaction);
  if (interaction.commandName === 'daily') return handleDaily(interaction);
  if (interaction.commandName === 'translate') return handleTranslate(interaction);
  if (interaction.commandName === 'poll') return handlePoll(interaction);
  if (interaction.commandName === 'welcome') return handleWelcome(interaction);
  if (interaction.commandName === 'resource') return handleResource(interaction);
  if (interaction.commandName === 'help') return handleHelp(interaction);
}

export async function handleButton(interaction) {
  if (interaction.customId.startsWith('poll:')) return handlePollVote(interaction);
  if (interaction.customId.startsWith('selfrole:')) return handleSelfRole(interaction);
}

export { handleMemberJoin };
