import type { Game } from './types';
const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const stamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
export function calendarFile(game: Game): string {
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Keystone//Sports Calendar//EN','BEGIN:VEVENT',
    `UID:${game.espnLeague}-${game.id}@keystone`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(game.start)}`,
    `SUMMARY:${escape(game.name)}`, `LOCATION:${escape(game.venue ?? '')}`,
    `DESCRIPTION:${escape([game.broadcast, game.sourceUrl, 'Check the source for schedule changes.'].filter(Boolean).join('\n'))}`,
    'END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
export function downloadGameCalendar(game: Game) {
  const url = URL.createObjectURL(new Blob([calendarFile(game)], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `keystone-${game.id.replace(/[^a-z0-9-]/gi, '')}.ics`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
