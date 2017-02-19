import * as channel from './channel';

export class Tunnel extends channel.Channel {
  /**
   * Emit an event with an optional payload.
   *
   * @param {String} event
   * @param {*} [payload]
   */
  emit(event, payload) {
    super.emit('event', {event, payload});
  }
}

/**
 * Create a named tunnel.
 *
 * @param {String} name
 */
export function create(name) {
  const devtools = new Map();
  const contents = new Map();

  const listen = (type, host, remote, id) => {
    channel.connect(`tunnel/${name}/${type}`, c => {
      let tab;

      c.once('init', (payload, sender) => {
        host.set(tab = id(payload, sender), c);
      });

      c.on('event', ({event, payload}) => {
        if (remote.has(tab)) {
          remote.get(tab).emit(event, payload);
        }
      });

      c.on('disconnect', () => {
        host.delete(tab);
      });
    });
  };

  listen('devtools', devtools, contents, payload => payload);
  listen('contents', contents, devtools, (_, {tab}) => tab.id);
}

/**
 * Connect to a named tunnel.
 *
 * @param {String} name
 * @param {Function} handler
 */
export function connect(name, handler) {
  const devtools = chrome.devtools !== undefined;
  const type = devtools ? 'devtools' : 'contents';

  channel.connect(`tunnel/${name}/${type}`, c => {
    c.emit('init', devtools ?
      chrome.devtools.inspectedWindow.tabId :
      undefined
    );

    handler(new Tunnel(c));
  });
}
