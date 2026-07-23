import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageType} from '@/common/logs/LogMessageType';

const activityLimit = 12;

function messageIdentity(message: LogMessage): string {
  return JSON.stringify({
    timestamp: message.timestamp,
    type: message.type,
    message: message.message,
    data: message.data,
    playerId: message.playerId,
  });
}

function isSameMessage(first: LogMessage, second: LogMessage): boolean {
  return messageIdentity(first) === messageIdentity(second);
}

function isGenerationMessage(message: LogMessage): boolean {
  return message.type === LogMessageType.NEW_GENERATION;
}

function lastIndexMatching(messages: ReadonlyArray<LogMessage>, pattern: RegExp): number {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (pattern.test(messages[index].message)) {
      return index;
    }
  }
  return -1;
}

function includeImmediateLeadIn(messages: ReadonlyArray<LogMessage>, anchorIndex: number): number {
  const anchorTimestamp = messages[anchorIndex].timestamp;
  let start = anchorIndex;
  while (start > 0 && anchorTimestamp - messages[start - 1].timestamp <= 1500) {
    start--;
  }
  return start;
}

/**
 * Finds the latest coherent action when the Focus view is first opened.
 * Played-card messages take priority because card effects often log a later
 * draw, placement, or conversion as part of the same action.
 */
export function latestActivityGroup(messages: ReadonlyArray<LogMessage>): Array<LogMessage> {
  const recent = messages.filter((message) => !isGenerationMessage(message)).slice(-activityLimit);
  if (recent.length <= 1) {
    return recent;
  }

  const playedIndex = lastIndexMatching(recent, /\bplayed\b/i);
  if (playedIndex >= 0) {
    return recent.slice(includeImmediateLeadIn(recent, playedIndex));
  }

  const actionIndex = lastIndexMatching(
    recent,
    /\b(drew|used|traded|claimed|funded|sold|passed|converted|placed|selected|kept|revealed)\b/i,
  );
  if (actionIndex >= 0) {
    return recent.slice(includeImmediateLeadIn(recent, actionIndex));
  }

  const latestTimestamp = recent[recent.length - 1]?.timestamp;
  if (latestTimestamp === undefined) {
    return [];
  }
  let start = recent.length - 1;
  while (start > 0 && latestTimestamp - recent[start - 1].timestamp <= 1500) {
    start--;
  }
  return recent.slice(start);
}

/**
 * Returns only messages appended since the previous log response. The API is
 * a rolling 50-message window, so compare the old suffix with the new prefix
 * instead of relying on array lengths or timestamps alone.
 */
export function appendedActivityMessages(
  previous: ReadonlyArray<LogMessage>,
  next: ReadonlyArray<LogMessage>,
): Array<LogMessage> {
  if (previous.length === 0) {
    return latestActivityGroup(next);
  }

  const maximumOverlap = Math.min(previous.length, next.length);
  for (let overlap = maximumOverlap; overlap > 0; overlap--) {
    const previousStart = previous.length - overlap;
    let matches = true;
    for (let index = 0; index < overlap; index++) {
      if (!isSameMessage(previous[previousStart + index], next[index])) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return next.slice(overlap).filter((message) => !isGenerationMessage(message)).slice(-activityLimit);
    }
  }

  return latestActivityGroup(next);
}
