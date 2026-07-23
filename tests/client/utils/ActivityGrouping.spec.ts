import {expect} from 'chai';
import {CardName} from '@/common/cards/CardName';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {appendedActivityMessages, latestActivityGroup} from '@/client/utils/ActivityGrouping';

function message(text: string, timestamp: number, card?: CardName): LogMessage {
  const result = new LogMessage(
    LogMessageType.DEFAULT,
    text,
    card === undefined ? [] : [{type: LogMessageDataType.CARD, value: card}],
  );
  result.timestamp = timestamp;
  return result;
}

describe('ActivityGrouping', () => {
  it('keeps a played card with its immediate lead-in and every result that follows it', () => {
    const logs = [
      message('${0} gained 2 energy production', 100),
      message('${0} played ${1}', 200, CardName.STRIP_MINE),
      message('${0} gained 2 steel production', 201),
      message('${0} gained 1 titanium production', 202),
      message('${0} lost 2 energy production', 203),
    ];

    expect(latestActivityGroup(logs).map((entry) => entry.message)).to.deep.eq([
      '${0} gained 2 energy production',
      '${0} played ${1}',
      '${0} gained 2 steel production',
      '${0} gained 1 titanium production',
      '${0} lost 2 energy production',
    ]);
  });

  it('extracts every message appended to a rolling log window', () => {
    const shared = [message('two', 2), message('three', 3), message('four', 4)];
    const previous = [message('one', 1), ...shared];
    const next = [...shared, message('${0} played ${1}', 5, CardName.STRIP_MINE), message('lost production', 6)];

    expect(appendedActivityMessages(previous, next).map((entry) => entry.message)).to.deep.eq([
      '${0} played ${1}',
      'lost production',
    ]);
  });

  it('uses the draw message as the initial focus group', () => {
    const logs = [
      message('older action', 10),
      message('${0} drew ${1}', 2000, CardName.ALGAE),
    ];

    expect(latestActivityGroup(logs)).to.deep.eq([logs[1]]);
  });
});
