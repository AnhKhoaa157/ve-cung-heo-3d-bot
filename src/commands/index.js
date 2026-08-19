import { taskCommand, handleTask } from './task.js';
import { meetingCommand, handleMeeting } from './meeting.js';
import { notifyCommand, handleNotify } from './notify.js';
import { dailyCommand, handleDaily } from './daily.js';
import { translateCommand, handleTranslate } from './translate.js';
import { pollCommand, handlePoll, handlePollVote } from './poll.js';

export const commandDefinitions = [taskCommand, meetingCommand, notifyCommand, dailyCommand, translateCommand, pollCommand].map((command) => command.toJSON());

export async function handleCommand(interaction) {
  if (interaction.commandName === 'task') return handleTask(interaction);
  if (interaction.commandName === 'meeting') return handleMeeting(interaction);
  if (interaction.commandName === 'notify') return handleNotify(interaction);
  if (interaction.commandName === 'daily') return handleDaily(interaction);
  if (interaction.commandName === 'translate') return handleTranslate(interaction);
  if (interaction.commandName === 'poll') return handlePoll(interaction);
}

export async function handleButton(interaction) {
  if (interaction.customId.startsWith('poll:')) return handlePollVote(interaction);
}
